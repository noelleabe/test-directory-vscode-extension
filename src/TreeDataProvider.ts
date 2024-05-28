import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// important note: this only works if:
// 1) the tests and stories directories are flat and don't have nested folders
// 2) the components are stored in web/src/* and the tests and stories directories are called web/src/tests and web/src/stories respectively.
// 3) the first part of the test and story file names match the component file names exactly.
//    a component called BackButton.tsx can have a test file BackButton.test.tsx but not AnotherBackButton.test.tsx
// 4) you have to manually refresh when files are added/removed/renamed
export class TreeDataProvider implements vscode.TreeDataProvider<FileItem> {
  constructor(private workspaceRoot: string) {}
  
 getTreeItem(element: FileItem): vscode.TreeItem {
    return element;
  }

  // called at the very beginning and for each collapsible item
  getChildren(element?: FileItem): Thenable<FileItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No FileItem in empty workspace');
      return Promise.resolve([]);
    }

    // not the top level of the workspace directory
    if (element) {
      const isTestOrStoryDirectory = this.inTestOrStoryDirectory(element.resourceUri.fsPath);

      // search for matching test and story files in their directories
      if (!isTestOrStoryDirectory) {
        return Promise.resolve(
            this.getCombinedComponentsWithTestFiles(element.resourceUri.fsPath)
          );
      }
      else {
        return Promise.resolve(
            this.getAllFilesInDirectory(element.resourceUri.fsPath)
          );
      }
    } 
    // the top level of the workspace directory
    else {
        return Promise.resolve(this.getAllFilesInDirectory(this.workspaceRoot));
    }
  }

private inTestOrStoryDirectory(directoryPath: string) {
    return directoryPath === path.join(this.workspaceRoot, 'tests') || directoryPath === path.join(this.workspaceRoot, 'stories');
}
private isTestOrStoryFile(label: string) {
    return label.includes('.test.') || label.includes('.stories.');
}

// for each file in each directory except /tests and /stories, check in /tests and /stories directory for matching test files
private getCombinedComponentsWithTestFiles(directoryPath: string): FileItem[] {
    const allFiles = this.getAllFilesInDirectory(directoryPath);
    const result: FileItem[] = [];
    
    allFiles.forEach((file: FileItem) => {
        const fileLabel = file.label;
        result.push(file);
        if (!this.isTestOrStoryFile(fileLabel)) {
            result.push(
                ...this.findMatchingFiles(
                    path.join(this.workspaceRoot, 'tests'), fileLabel
                ), 
                ...this.findMatchingFiles(
                    path.join(this.workspaceRoot, 'stories'), fileLabel
                )
            );
        }
    });

    return result;
}

// just checks that the first part of the filename matches
private findMatchingFiles(directoryPath: string, componentLabel: string): FileItem[] {
    return this.getAllFileNamesInDirectory(directoryPath).filter((fileName: string) =>{
        const splitPath = componentLabel.split('.');
        const isTestFile = fileName.indexOf(`${splitPath[0]}.test.`) === 0 || fileName.indexOf(`${splitPath[0]}.stories.`) === 0;
        return isTestFile;
    } ).map((fileName: string) => this.createFileItem({
        element: fileName,
        directoryPath,
        displayTestIcon: true
    }));
}

// returns all elements in a directory and updates UI depending on if an element is a file or directory
private getAllFileNamesInDirectory(directoryPath: string): string[] {
    if (this.pathExists(directoryPath)) {
        return fs.readdirSync(directoryPath);
    } 
    else {
        return [];
    }
  }

private createFileItem({element, directoryPath, displayTestIcon}: {element: string, directoryPath: string, displayTestIcon: boolean}): FileItem {
    const filePath = path.join(directoryPath, element);
    const isDirectory = fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
    return new FileItem(
        element,
        vscode.Uri.file(filePath),
        isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, 
        isDirectory ? undefined : {
            command: 'vscode.open',
            title: '',
            arguments: [vscode.Uri.file(filePath)],
        },
        displayTestIcon
    );
}

// returns all elements in a directory and updates UI depending on if an element is a file or directory
private getAllFilesInDirectory(directoryPath: string): FileItem[] {
    const allElements = this.getAllFileNamesInDirectory(directoryPath);
    const displayTestIcon = this.inTestOrStoryDirectory(directoryPath);

    return allElements.map((element: string) =>
        this.createFileItem({
            element,
            directoryPath,
            displayTestIcon
        })
    );
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }
    return true;
  }

  private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}


const testIconPath = path.join(__filename, '..', '..', 'resources', 'TestLogo.png');

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly isTestOrStoryFile?: boolean,
  ) {
    super(resourceUri, collapsibleState);
    this.tooltip = resourceUri.fsPath;
    this.command = command;
    this.label = label;
    this.iconPath = isTestOrStoryFile ? testIconPath : undefined;
  }  
}
