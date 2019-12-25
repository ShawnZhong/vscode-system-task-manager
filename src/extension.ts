/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

"use strict";

import * as vscode from "vscode";
import { listProcesses, ProcessItem } from "./ps";
import { TreeDataProvider, TreeItem, EventEmitter, Event } from "vscode";

const POLL_INTERVAL = 5000;

let processViewer: vscode.TreeView<ProcessTreeItem>;

export function activate(context: vscode.ExtensionContext) {
  if (!processViewer) {
    const provider = new ProcessProvider();
    processViewer = vscode.window.createTreeView(
      "extension.vscode-processes.processViewer",
      { treeDataProvider: provider }
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.vscode-processes.showProcessView",
      () => {
        vscode.commands.executeCommand(
          "setContext",
          "extension.vscode-processes.processViewerContext",
          true
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "extension.vscode-processes.kill",
      (item: ProcessTreeItem) => {
        if (item._pid) {
          process.kill(item._pid, "SIGTERM");
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
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

class ProcessTreeItem extends TreeItem {
  _parent: ProcessTreeItem;
  _pid: number;
  _cmd: string;
  _children: ProcessTreeItem[];
  _load: string;

  constructor(parent: ProcessTreeItem, pid: number) {
    super("", vscode.TreeItemCollapsibleState.None);
    this._parent = parent;
    this._pid = pid;
  }

  getChildren(): ProcessTreeItem[] {
    return this._children || [];
  }

  get id(): string {
    return this._pid.toString();
  }

  /*
   * Update this item with the information from the given ProcessItem.
   * Returns the elementId of the subtree that needs to be refreshed or undefined if nothing has changed.
   */
  merge(process: ProcessItem, newItems?: ProcessTreeItem[]): ProcessTreeItem {
    if (!process) {
      return undefined;
    }

    // update item's name
    const oldLabel = this.label;
    const oldTooltip = this.tooltip;
    if (process === null) {
      // terminated
      if (!this.label.startsWith("[[ ")) {
        this.label = `[[ ${this.label} ]]`;
      }
    } else {
      this._cmd = process.command;
      this.tooltip = process.command;

      if (process.load) {
        this._load = process.load;
      }
      if (this._load && process.mem) {
        this.label = `${process.name} (${this._load}, ${process.mem})`;
      } else if (process.mem) {
        this.label = `${process.name} (${process.mem})`;
      } else {
        this.label = process.name;
      }
    }
    let changed = this.label !== oldLabel || this.tooltip !== oldTooltip;

    // update children
    const childChanges: ProcessTreeItem[] = [];
    const nextChildren: ProcessTreeItem[] = [];
    if (process) {
      process.children = process.children || [];
      for (const child of process.children) {
        let found = this._children
          ? this._children.find(c => child.pid === c._pid)
          : undefined;
        if (!found) {
          found = new ProcessTreeItem(this, child.pid);
          if (newItems) {
            newItems.push(found);
          }
          changed = true;
        }
        const changedChild = found.merge(child, newItems);
        if (changedChild) {
          childChanges.push(changedChild);
        }
        nextChildren.push(found);
      }

      if (this._children) {
        for (const child of this._children) {
          const found = process.children.find(c => child._pid === c.pid);
          if (!found) {
            changed = true;
          }
        }
      }
    }
    this._children = nextChildren;

    // update collapsible state
    const oldCollapsibleState = this.collapsibleState;
    // custom explorer bug: https://github.com/Microsoft/vscode/issues/40179
    this.collapsibleState =
      this._children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None;
    if (this.collapsibleState !== oldCollapsibleState) {
      changed = true;
    }

    // attribute changes or changes in more than one child
    if (changed || childChanges.length > 1) {
      return this;
    }

    // changes only in one child -> propagate that child for refresh
    if (childChanges.length === 1) {
      return childChanges[0];
    }

    // no changes
    return undefined;
  }
}

export class ProcessProvider implements TreeDataProvider<ProcessTreeItem> {
  private _root: ProcessTreeItem;

  private _onDidChangeTreeData: EventEmitter<
    ProcessTreeItem
  > = new EventEmitter<ProcessTreeItem>();
  readonly onDidChangeTreeData: Event<ProcessTreeItem> = this
    ._onDidChangeTreeData.event;

  getTreeItem(
    processTreeItem: ProcessTreeItem
  ): ProcessTreeItem | Thenable<ProcessTreeItem> {
    return processTreeItem;
  }

  getParent(element: ProcessTreeItem): ProcessTreeItem {
    return this._root;
  }

  getChildren(
    element?: ProcessTreeItem
  ): vscode.ProviderResult<ProcessTreeItem[]> {
    if (!element) {
      if (!this._root) {
        this._root = new ProcessTreeItem(undefined, 0);

        return listProcesses()
          .then(root => {
            this.scheduleNextPoll(1);
            this._root.merge(root);
            return this._root.getChildren();
          })
          .catch(err => {
            return this._root.getChildren();
          });
      }
      element = this._root;
    }
    return element.getChildren();
  }

  scheduleNextPoll(cnt: number = 1) {
    setTimeout(_ => {
      listProcesses()
        .then(root => {
          if (processViewer.visible) {
            // schedule next poll only if still visible
            this.scheduleNextPoll(cnt + 1);
          }
          const newItems: ProcessTreeItem[] = [];
          let processTreeItem = this._root.merge(root, newItems);
          if (processTreeItem) {
            // workaround for https://github.com/Microsoft/vscode/issues/40185
            if (processTreeItem === this._root) {
              processTreeItem = undefined;
            }
            this._onDidChangeTreeData.fire(processTreeItem);
            if (newItems.length > 0 && processViewer.visible) {
              for (const newItem of newItems) {
                processViewer.reveal(newItem, { select: false }).then(
                  () => {
                    // ok
                  },
                  error => {
                    //console.log(error + ': ' + newItem.label);
                  }
                );
              }
            }
          }
        })
        .catch(err => {
          // if we do not call 'scheduleNextPoll', polling stops
        });
    }, POLL_INTERVAL);
  }
}
