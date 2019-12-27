/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

"use strict";

import {
  TreeView,
  ExtensionContext,
  commands,
  window,
  TreeViewVisibilityChangeEvent
} from "vscode";
import { ProcessProvider, ConnectionProvider } from "./provider";
import { SysInfoTreeItem } from "./ProcessTreeItem";

export function activate(context: ExtensionContext) {
  const processProvider = new ProcessProvider();
  const processViewer: TreeView<SysInfoTreeItem> = window.createTreeView(
    "system-task-manager.processViewer",
    {
      treeDataProvider: processProvider
    }
  );

  processViewer.onDidChangeVisibility((e: TreeViewVisibilityChangeEvent) => {
    if (e.visible) {
      processProvider.startUpdate();
    } else {
      processProvider.stopUpdate();
    }
  });

  const connectionProvider = new ConnectionProvider();
  const networkViewer = window.createTreeView(
    "system-task-manager.networkViewer",
    {
      treeDataProvider: connectionProvider
    }
  );
  networkViewer.onDidChangeVisibility((e: TreeViewVisibilityChangeEvent) => {
    if (e.visible) {
      connectionProvider.startUpdate();
    } else {
      connectionProvider.stopUpdate();
    }
  });

  context.subscriptions.push(
    commands.registerCommand(
      "system-task-manager.forceKill",
      (item: SysInfoTreeItem) => {
        if (!item._pid) return;
        process.kill(item._pid, "SIGKILL");
      }
    ),
    commands.registerCommand(
      "system-task-manager.kill",
      (item: SysInfoTreeItem) => {
        if (!item._pid) return;
        process.kill(item._pid, "SIGTERM");
      }
    ),
    commands.registerCommand("system-task-manager.refresh", () => {
      processProvider.update();
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
