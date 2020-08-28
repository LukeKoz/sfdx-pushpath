# sfdx-sourceset

Push source from specific paths or packages with SFDX.

## Installation

This is an SFDX plugin. Install this plugin to your SFDX instance.

## How it works

`source:push` works by taking the path you specify and traversing upwards in the directory tree, retrieving a list of 
paths to ignore. It then adds the paths to the `.forceignore` file and pushes the source. Once the source has been pushed,
it removes the paths from `.forceignore`.

## Flags

This command runs `force:source:push` so it uses the same flags with the exception of two new flags:

| Flag Name | Required | Description |
| :--- | :--- | :--- |
| --path | false* | Path of the source you wish to push |
| --package | false* | Name of the package to push |

\* You must specify either path or package (not both or neither) 

## Prerequisites

Ensure you have `.forceignore` in the root directory.

## Usage

To push a specific package into your org, specify the package name under the `--package` flag.

```shell
$ sfdx sourceset:push -u [ALIAS] --package [PACKAGE] -f
```

To push a specific path into your org, specify the path name under the `--path` flag.

```shell
$ sfdx sourceset:push -u [ALIAS] --path "force-app/main/helpers" -f
```

## Notes
* This plugin does not yet have unit tests.
