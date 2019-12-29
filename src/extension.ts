"use strict";

import * as vscode from "vscode";
import { SysInfoTreeItem } from "./SysInfoTreeItem";
import {
  ProcessInfoProvider,
  ConnectionInfoProvider,
  SysInfoProvider
} from "./providers";

function _createTreeView(id: string, treeDataProvider: SysInfoProvider) {
  const treeView = vscode.window.createTreeView(id, { treeDataProvider });

  treeView.onDidChangeVisibility((e: vscode.TreeViewVisibilityChangeEvent) => {
    if (e.visible) {
      treeDataProvider.startUpdate();
    } else {
      treeDataProvider.stopUpdate();
    }
  });
}

export function activate(context: vscode.ExtensionContext) {
  const processInfoProvider = new ProcessInfoProvider();
  const connectionInfoProvider = new ConnectionInfoProvider();

  _createTreeView("system-task-manager.processViewer", processInfoProvider);
  _createTreeView("system-task-manager.networkViewer", connectionInfoProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "system-task-manager.forceKill",
      (item: SysInfoTreeItem) => {
        if (!item._pid) return;
        process.kill(item._pid, "SIGKILL");
      }
    ),
    vscode.commands.registerCommand(
      "system-task-manager.kill",
      (item: SysInfoTreeItem) => {
        if (!item._pid) return;
        process.kill(item._pid, "SIGTERM");
      }
    ),
    vscode.commands.registerCommand("system-task-manager.refresh", () => {
      processInfoProvider.update();
      connectionInfoProvider.update();
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
