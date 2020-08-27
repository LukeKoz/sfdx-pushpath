import * as fs from 'fs';
import * as path from 'path';

const START_NOTATION = '###########[AUTOMATED_IGNORE_MANAGEMENT_START]###########';
const END_NOTATION = '###########[AUTOMATED_IGNORE_MANAGEMENT_END]###########';

export default class IgnoreManager {

  /**
   * Get a list of ignores
   */
  private paths: string[];

  /**
   * Retrieve and initiate the force ignore management utility
   */
  public constructor() {

  }

  /**
   * Get the forceignore file path
   */
  public get forceIgnorePath() {
    return path.resolve(process.cwd(), '.forceignore');
  }

  /**
   * Get a list of ignored paths
   */
  public get ignoredPaths(): string[] {
    if (!this.paths) {
      const fileData = fs.readFileSync(this.forceIgnorePath).toString();

      if (fileData && fileData.includes(START_NOTATION) && fileData.includes(END_NOTATION)) {
        this.paths = fileData.substring(
          fileData.indexOf(START_NOTATION) + START_NOTATION.length,
          fileData.indexOf(END_NOTATION) + END_NOTATION.length
        ).split('\n');
      }
    }

    this.paths = [];
    return this.paths;
  }

  /**
   * Add a path to the list of ignored paths
   * @param pathToAdd
   */
  public addPath(pathToAdd: string): void {
    if (!this.paths.includes(pathToAdd)) {
      this.paths.push(pathToAdd);
    }
  }

  /**
   * Add multiple paths to the list of ignored paths
   * @param pathsToAdd
   */
  public addPaths(pathsToAdd: string[]): void {
    pathsToAdd.forEach(path => this.addPath(path));
  }

  /**
   * Remove a path from the list
   * @param pathToRemove
   */
  public removePath(pathToRemove: string): void {
    this.paths.splice(this.paths.indexOf(pathToRemove), 1);
  }

  /**
   * Clear all paths
   */
  public clear(): void {
    this.paths = [];
  }

  /**
   * Save the forceignore
   */
  public save(): void {
    let fileData = fs.readFileSync(this.forceIgnorePath).toString();

    let pathsToAdd = this.paths.join('\n');

    if (fileData && fileData.includes(START_NOTATION) && fileData.includes(END_NOTATION)) {
      let startIndex = fileData.indexOf(START_NOTATION);
      let endIndex = fileData.indexOf(END_NOTATION) + END_NOTATION.length;

      // Remove existing ignore data if any
      const startData = fileData.substring(0, startIndex);
      const endData = fileData.substring(endIndex);
      fileData = startData + endData;
    }

    // Add ignore data
    fileData += `
    ${START_NOTATION}
    ${pathsToAdd}
    ${END_NOTATION}`;

    fs.writeFileSync(this.forceIgnorePath, fileData);
  }

}
