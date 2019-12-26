/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

"use strict";

import { TreeView, ExtensionContext, commands, window } from "vscode";
import { ProcessProvider } from "./ProcessProvider";
import { ProcessTreeItem } from "./ProcessTreeItem";

export let processViewer: TreeView<ProcessTreeItem>;

export function activate(context: ExtensionContext) {
  if (!processViewer) {
    const provider = new ProcessProvider();
    processViewer = window.createTreeView(
      "extension.vscode-processes.processViewer",
      { treeDataProvider: provider }
    );
  }

  context.subscriptions.push(
    commands.registerCommand(
      "extension.vscode-processes.showProcessView",
      () => {
        commands.executeCommand(
          "setContext",
          "extension.vscode-processes.processViewerContext",
          true
        );
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      "extension.vscode-processes.kill",
      (item: ProcessTreeItem) => {
        if (item._pid) {
          process.kill(item._pid, "SIGTERM");
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      "extension.vscode-processes.forceKill",
      (item: ProcessTreeItem) => {
        if (item._pid) {
          process.kill(item._pid, "SIGKILL");
        }
      }
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
