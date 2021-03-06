import {flags, SfdxCommand} from '@salesforce/command';
import {Messages, SfdxError} from '@salesforce/core';
import {AnyJson} from '@salesforce/ts-types';
import * as proc from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import IgnoreManager from '../../utils/IgnoreManager';

// Lib
import * as project from '../../utils/project';

// Import messages
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sfdx-sourceset', 'path');

/**
 * Install NPM module command class
 */
export default class Push extends SfdxCommand {

  /**
   * Description of the command
   */
  public static description = messages.getMessage('commandDescription');

  /**
   * Examples
   */
  public static examples = [
    `$ sfdx sourceset:push -u my-org --path ./force-app/node_modules -f
    $ sfdx sourceset:push -u my-org --package my-package -f
    `
  ];

  public static args = [];

  /**
   * Command flags
   * @protected
   */
  protected static flagsConfig = {
    json: flags.boolean({description: messages.getMessage('jsonDescription')}),
    loglevel: flags.enum({
      description: messages.getMessage('loglevelDescription'),
      options: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
    }),
    targetusername: flags.string({required: true, char: 'u', description: messages.getMessage('targetUsernameDescription')}),
    apiversion: flags.string({description: messages.getMessage('apiVersionDescription')}),
    forceoverwrite: flags.boolean({char: 'f', description: messages.getMessage('forceOverwriteDescription')}),
    ignorewarnings: flags.boolean({char: 'g', description: messages.getMessage('ignoreWarningsDescription')}),
    wait: flags.minutes({char: 'w', description: messages.getMessage('apiVersionDescription')}),
    path: flags.string({description: messages.getMessage('pathDescription')}),
    package: flags.string({description: messages.getMessage('packageDescription')})
  };

  // Requires a project workspace
  protected static requiresProject = true;

  /**
   * SFDX Project
   */
  public sfdxProject: AnyJson;

  /**
   * A record of all log outputs
   */
  public outputs = [];

  /**
   * Run the command
   */
  public async run(): Promise<AnyJson> {
    // Get the sfdx project
    this.sfdxProject = project.getSfdxProject();
    if (!this.sfdxProject.packageDirectories) {
      throw new SfdxError(messages.getMessage('invalidSfdxProject'));
    }

    // Check that the path that is being pushed exists
    this.validatePaths();

    // Get the paths to block
    const paths = this.getPathsToBlock();

    // Block the paths
    this.blockPaths(paths);
    // Push the source
    const result = await this.pushSource();
    // Unblock the paths
    this.unblockPaths();

    return result;
  }

  /**
   * Get the SFDX package detail
   * @param packageName
   * @private
   */
  private getPackage(packageName: string): AnyJson {
    const pkg = this.sfdxProject.packageDirectories.find(pkg => pkg.package === packageName);

    if (!pkg) {
      throw new SfdxError(messages.getMessage('invalidPackage', [packageName]));
    }

    return pkg;
  }

  /**
   * Get the path to push
   * @private
   */
  private getPathToPush(): string[] {
    let pathToPush;

    if (this.flags.package) {
      const packageNames = this.flags.package.split(',');
      pathToPush = this.sfdxProject.packageDirectories.filter(pkg => packageNames.includes(pkg.package)).map(pkg => pkg.path);
    } else if (this.flags.path) {
      pathToPush = this.flags.path.split(',');
    }

    return pathToPush;
  }

  /**
   * Validate paths
   * @private
   */
  private validatePaths(): void {
    for (const pathToPush of this.getPathToPush()) {
      if (fs.existsSync(this.getPathToPush())) {
        throw new SfdxError(messages.getMessage('invalidPath', [pathToPush]));
      }
    }
  }

  /**
   * Get a list of of paths to be blocked
   * @private
   */
  private getPathsToBlock(): string[] {
    const pathsToPush = this.getPathToPush();
    const isPackage = !!this.flags.package;

    // Block all other packages
    if (isPackage) {
      return this.sfdxProject.packageDirectories
        .filter(pkg => !pathsToPush.includes(pkg.path))
        .map(pkg => pkg.path.replace(/^\.\//, ''));
    }

    const paths = [];

    for (const pathToPush of pathsToPush) {
      let currentPath = path.resolve(process.cwd(), pathToPush);
      let i = 0;

      // Traverse up the path tree to ignore all other sibling paths
      while (currentPath !== process.cwd() || i === 20) {
        const pushing = path.basename(currentPath);
        currentPath = path.resolve(currentPath, '..');
        this.log(currentPath);

        const dirs = fs.readdirSync(currentPath).filter(dir => {
          return dir !== pushing;
        }).map(dir => path.resolve(currentPath, dir));

        paths.push.apply(paths, dirs);
        i++;
      }
    }

    return paths;
  }

  /**
   * Block all other directories to be pushed
   */
  private blockPaths(paths: string[]): void {
    const ignore = new IgnoreManager();
    ignore.addPaths(paths);
    ignore.save();
  }

  /**
   * Unblock all paths previously blocked
   * @param paths
   * @private
   */
  private unblockPaths(): void {
    const ignore = new IgnoreManager();
    ignore.clear();
    ignore.save();
  }

  /**
   * Run the NPM install command on the current working directory
   */
  private async pushSource(): Promise<AnyJson> {
    const processFlags = ['--json'];
    Object.keys(this.flags)
      .filter(flag => !['path', 'package'].includes(flag))
      .forEach(flag => {
        if (typeof this.flags[flag] === 'boolean' && this.flags[flag]) {
          processFlags.push((flag.length > 1 ? '--' : '-') + flag);
        } else {
          processFlags.push((flag.length > 1 ? '--' : '-') + flag);
          processFlags.push(this.flags[flag]);
        }
      });

    return new Promise((resolve, reject) => {
      let outputs = [];

      try {
        outputs.push('sourceset:push DIR = ' + process.cwd());
        outputs.push('sfdx force:source:push ' + processFlags.join(' '));
        const ignore = new IgnoreManager();
        outputs.push(ignore.getIgnoredPaths());

        const child = proc.spawn('sfdx force:source:push', processFlags, {
          cwd: process.cwd(),
          shell: true
        });

        child.stdout.on('data', message => {
          outputs.push(message.toString());
        });

        child.on('exit', (code, signal) => {
          resolve({
            outputs
          });
        });

        child.stderr.on('error', err => {
          throw new SfdxError(err.toString());
        });
      } catch (e) {
        throw new SfdxError(e?.message || e);
      }
    });
  }

  /**
   * Log an output
   * @param message
   * @private
   */
  private log(message: string): void {
    this.outputs.push(message);
    this.ux.log(message);
  }
}
