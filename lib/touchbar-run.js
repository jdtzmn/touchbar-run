'use babel'

import { existsSync } from 'fs'
import { join } from 'path'
import { CompositeDisposable, File } from 'atom'

import * as project from './projectInfo'

import { TouchBar } from 'remote'
const { TouchBarPopover, TouchBarButton } = TouchBar

const scriptsPopoverId = 'touchbar-run-scripts'

export default {

  touchbarRegistry: null,
  onDidChangeActivePaneItem: new CompositeDisposable(),
  packageWatcher: new CompositeDisposable(),

  activate (state) {
    // Install touchbar-registry and platformio-ide-terminal dependency
    require('atom-package-deps').install('touchbar-run')

    // Listen to project path changes
    this.onDidChangeActivePaneItem = atom.workspace.getCenter().onDidChangeActivePaneItem(() => this.addScriptsToTouchbar())
  },

  consumeTouchBar (touchbarRegistry) {
    this.touchbarRegistry = touchbarRegistry
    this.addScriptsToTouchbar()
  },

  consumePlatformIOIDETerminal (terminal) {
    this.terminal = terminal
  },

  deactivate () {
    this.onDidChangeActivePaneItem.dispose()
    this.packageWatcher.disposee()
  },

  executeScript (scriptName, scriptCommand) {
    // Check if script exists in node_modules/.bin
    const projectPath = project.getPath()
    const commandName = scriptCommand.split(' ')[0]
    const isNodeModule = existsSync(join(projectPath, `./node_modules/.bin/${commandName}`))

    // Run as npm run if the command is a node module
    if (isNodeModule) return this.terminal.run([`npm run ${scriptName}`])
    this.terminal.run([scriptCommand])
  },

  generateScriptButtons (packageScripts) {
    // Generate scriptButtons
    const scriptButtons = []

    Object.keys(packageScripts).forEach((scriptName) => {
      const scriptCommand = packageScripts[scriptName]

      scriptButtons.push(new TouchBarButton({
        label: scriptName,
        backgroundColor: '#313440',
        click: () => {
          this.executeScript(scriptName, scriptCommand)
          this.touchbarRegistry.refresh()
        }
      }))
    })

    // Create TouchBarPopover
    const scriptsPopover = new TouchBarPopover({
      label: 'scripts',
      iconPosition: 'left',
      icon: join(__dirname, 'terminal@2x.png'),
      items: scriptButtons
    })

    return scriptsPopover
  },

  addScriptsToTouchbar () {
    // Check for package scripts
    const packageScripts = project.getPackageScripts()
    console.log(packageScripts)

    // Listen to package.json updates
    const filePath = project.getPackagePath()
    this.packageWatcher.dispose()
    this.packageWatcher = new File(filePath).onDidChange(() => this.addScriptsToTouchbar())

    // Only show the touchbar button if there are packageScripts
    if (packageScripts && Object.keys(packageScripts).length > 0) {
      const scriptsPopover = this.generateScriptButtons(packageScripts)
      this.touchbarRegistry.addItem(scriptsPopover, 70, scriptsPopoverId)
    } else {
      this.touchbarRegistry.removeItem(scriptsPopoverId)
    }
  }

}
