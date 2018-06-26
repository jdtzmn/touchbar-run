'use babel'

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { CompositeDisposable, File } from 'atom'

import { TouchBar } from 'remote'
const { TouchBarPopover, TouchBarButton } = TouchBar

const scriptsPopoverId = 'touchbar-run-scripts'

export default {

  touchbarRegistry: null,
  onDidChangeActivePaneItem: new CompositeDisposable(),
  packageWatcher: new CompositeDisposable(),

  activate (state) {
    // Install touchbar-registry dependency
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

  getProjectPath () {
    // Get the current active file in the workspace
    const activeItem = atom.workspace.getCenter().getActivePaneItem()
    if (!activeItem) return null
    const file = activeItem.buffer.file
    if (!file) return null
    const activePath = activeItem.buffer.file.path

    // Check which project path the file is located in
    const projectPaths = atom.project.getPaths()
    const projectPath = projectPaths.find((path) => activePath.indexOf(activePath) !== -1)

    return projectPath
  },

  getPackagePath () {
    const projectPath = this.getProjectPath()
    if (!projectPath) return null

    // Return the package.json from that project path
    const filePath = join(projectPath, './package.json')
    return filePath
  },

  getPackageScripts () {
    // Check for package.json
    const filePath = this.getPackagePath()
    if (!filePath) return []
    const packageFileExists = existsSync(filePath)
    if (!packageFileExists) return []

    // Scrape scripts
    let packageScripts
    const packageContents = readFileSync(filePath, 'utf8')
    try {
      packageScripts = JSON.parse(packageContents).scripts
    } catch (e) {
      return []
    }

    return packageScripts
  },

  executeScript (scriptName, scriptCommand) {
    // Check if script exists in node_modules/.bin
    const projectPath = this.getProjectPath()
    const commandName = scriptCommand.split(' ')[0]
    const isNodeModule = existsSync(join(projectPath, `./node_modules/.bin/${commandName}`))

    // Run as npm run if the command is a node module
    if (isNodeModule) return this.terminal.run([`npm run ${scriptName}`])
    this.terminal.run([scriptCommand])
  },

  addScriptsToTouchbar () {
    // Check for package scripts
    const packageScripts = this.getPackageScripts()

    // Listen to package.json updates
    const filePath = this.getPackagePath()
    this.packageWatcher.dispose()
    this.packageWatcher = new File(filePath).onDidChange(() => this.addScriptsToTouchbar())

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

    // Create TouchBarGroup
    const scriptsPopover = new TouchBarPopover({
      label: 'scripts',
      iconPosition: 'left',
      icon: join(__dirname, 'terminal@2x.png'),
      items: scriptButtons
    })

    if (packageScripts) {
      this.touchbarRegistry.addItem(scriptsPopover, 70, scriptsPopoverId)
    } else {
      this.touchbarRegistry.removeItem(scriptsPopover)
    }
  }

}
