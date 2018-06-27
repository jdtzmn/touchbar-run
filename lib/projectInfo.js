'use babel'

import { readFileSync } from 'fs'
import { join } from 'path'

export default {
  // Gets the path of the current project
  getPath () {
    // Get the path of the current active item
    const projectPaths = atom.project.getPaths()
    if (projectPaths.length === 1) return projectPaths[0]

    // If there are multiple projects, get the path based on the current active item
    let activePath
    try {
      const activeItem = atom.workspace.getCenter().getActivePaneItem()
      activePath = activeItem.buffer.file.path
    } catch (e) {
      return null
    }

    // Check which project path the file is located in
    const projectPath = projectPaths.find((path) => activePath.indexOf(activePath) !== -1)

    return projectPath
  },

  // Gets the path for the package.json of the current project
  getPackagePath () {
    const projectPath = this.getPath()
    if (!projectPath) return null

    // Return the package.json from that project path
    const filePath = join(projectPath, './package.json')
    return filePath
  },

  // Scrapes the scripts from the package.json of the current project
  getPackageScripts () {
    let packageScripts
    try {
      const filePath = this.getPackagePath()
      const packageContents = readFileSync(filePath, 'utf8')
      packageScripts = JSON.parse(packageContents).scripts
    } catch (e) {}

    return packageScripts
  }
}
