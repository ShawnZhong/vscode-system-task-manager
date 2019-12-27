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
import { ProcessProvider } from "./ProcessProvider";
import { ProcessTreeItem } from "./ProcessTreeItem";

export let processViewer: TreeView<ProcessTreeItem>;

export function activate(context: ExtensionContext) {
  if (processViewer) return;

  const provider = new ProcessProvider();
  processViewer = window.createTreeView("system-task-manager.processViewer", {
    treeDataProvider: provider
  });

  processViewer.onDidChangeVisibility((e: TreeViewVisibilityChangeEvent) => {
    if (e.visible) {
      provider.startUpdate();
    } else {
      provider.stopUpdate();
    }
  });

  context.subscriptions.push(
    commands.registerCommand(
      "system-task-manager.forceKill",
      (item: ProcessTreeItem) => {
        if (!item._pid) return;
        process.kill(item._pid, "SIGKILL");
      }
    ),
    commands.registerCommand(
      "system-task-manager.kill",
      (item: ProcessTreeItem) => {
        if (!item._pid) return;
        process.kill(item._pid, "SIGTERM");
      }
    ),
    commands.registerCommand("system-task-manager.refresh", () => {
      provider.update();
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
