"use strict";

import * as vscode from "vscode";
import { SysInfoItem } from "./providers";

// Modified from https://github.com/weinand/vscode-processes/blob/master/src/extension.ts
export class SysInfoTreeItem extends vscode.TreeItem {
  pid: number;
  _children: SysInfoTreeItem[];

  constructor(pid: number, id: string) {
    super("", vscode.TreeItemCollapsibleState.None);
    this.pid = pid;
    this.id = id;
  }

  getChildren(): SysInfoTreeItem[] {
    return this._children || [];
  }

  /*
   * Update this item with the information from the given ProcessItem.
   * Returns the elementId of the subtree that needs to be refreshed or undefined if nothing has changed.
   */
  merge(process: SysInfoItem): SysInfoTreeItem {
    if (!process) {
      return undefined;
    }

    // update item's name
    const oldLabel = this.label;
    const oldTooltip = this.tooltip;

    this.tooltip = process.tooltip;
    this.label = process.label;
    let changed = this.label !== oldLabel || this.tooltip !== oldTooltip;

    // update children
    const childChanges: SysInfoTreeItem[] = [];
    const nextChildren: SysInfoTreeItem[] = [];
    if (process) {
      process.children = process.children || [];
      for (const child of process.children) {
        let found = this._children
          ? this._children.find(c => child.id === c.id)
          : undefined;
        if (!found) {
          found = new SysInfoTreeItem(child.pid, child.id);
          changed = true;
        }
        const changedChild = found.merge(child);
        if (changedChild) {
          childChanges.push(changedChild);
        }
        nextChildren.push(found);
      }

      if (this._children) {
        for (const child of this._children) {
          const found = process.children.find(c => child.id === c.id);
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
