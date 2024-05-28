// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TreeDataProvider } from './TreeDataProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const rootPath = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
    ? `${vscode.workspace.workspaceFolders[0].uri.fsPath}/web/src`
    : '';
	console.log('rootPath', rootPath);
	const treeDataProvider = new TreeDataProvider(rootPath);

	vscode.window.registerTreeDataProvider(
		'fileStructure', treeDataProvider
	);
	vscode.commands.registerCommand('fileStructure.refreshEntry', () =>
		treeDataProvider.refresh()
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
