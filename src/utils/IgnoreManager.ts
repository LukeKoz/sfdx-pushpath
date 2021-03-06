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
    this.getIgnoredPaths();
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
  public getIgnoredPaths(): string[] {
    if (!this.paths) {
      this.paths = [];

      const fileData = fs.readFileSync(this.forceIgnorePath).toString();

      if (fileData && fileData.includes(START_NOTATION) && fileData.includes(END_NOTATION)) {
        this.paths = fileData.substring(
          fileData.indexOf(START_NOTATION) + START_NOTATION.length,
          fileData.indexOf(END_NOTATION) + END_NOTATION.length
        ).split('\n');
      }
    }

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
    pathsToAdd.forEach(path => this.addPath(path.replace(process.cwd(), '')));
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

    const pathsToAdd = this.paths.join('\n');

    fileData += `# Added paths #######
`;
    fileData += this.paths.map(p => `#${p}`).join(`
`);
    fileData += `
# END PATH #########
`;

    if (fileData && fileData.includes(START_NOTATION) && fileData.includes(END_NOTATION)) {
      const startIndex = fileData.indexOf(START_NOTATION);
      const endIndex = fileData.indexOf(END_NOTATION) + END_NOTATION.length;

      // Remove existing ignore data if any
      const startData = fileData.substring(0, startIndex);
      const endData = fileData.substring(endIndex);
      fileData = startData + endData;
    }

    if (this.paths && this.paths.length > 0) {
      // Add ignore data
      fileData += `${START_NOTATION}
${pathsToAdd}
${END_NOTATION}`;
    }

    fs.writeFileSync(this.forceIgnorePath, fileData);
  }

}
