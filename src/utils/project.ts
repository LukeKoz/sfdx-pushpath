import {Messages, SfdxError} from '@salesforce/core';
import * as fs from 'fs-extra';
import * as path from 'path';
import {AnyJson} from '@salesforce/ts-types';

// Import messages
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sfdx-sourceset', 'project');

/**
 * Get the sfdx-project json file for this project
 */
const getSfdxProject = (rootPath): AnyJson => {
  const filePath = path.resolve(rootPath || process.cwd(), 'sfdx-project.json');
  if (!fs.existsSync(filePath)) {
    throw new SfdxError(messages.getMessage('missingPackageJson', [filePath]));
  }

  return JSON.parse(fs.readFileSync(filePath));
};

/**
 * Get the packages that match the dependencies of the default package
 * @param sfdxProject
 */
const getDependencies = (sfdxProject): AnyJson => {
  const defaultPackage = sfdxProject.packageDirectories.find(pkg => pkg.default);

  return (defaultPackage.dependencies || []).map(dep => {
    const packageName = dep.package.split('@')[0];
    return sfdxProject.packageDirectories.find(pkg => packageName === pkg.package);
  });
};

// Export modules
export {
  getSfdxProject,
  getDependencies
};
