"use strict";

import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { convertBytesToLargestUnit } from "./utils";
import { ProcessItem } from "./ProcessProvider";

export class ProcessTreeItem extends TreeItem {
  _parent: ProcessTreeItem;
  _pid: number;
  _children: ProcessTreeItem[];

  constructor(parent: ProcessTreeItem, pid: number) {
    super("", TreeItemCollapsibleState.None);
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

    const { command, name } = process;
    const load = `${process.pcpu}%`;
    const mem = convertBytesToLargestUnit(process.mem_rss);

    // update item's name
    const oldLabel = this.label;
    const oldTooltip = this.tooltip;

    this.tooltip = [
      `Name: ${command}`,
      `CPU Load: ${load}%`,
      `Memory: ${mem}`
    ].join("\n");
    this.label = `${name} (${load}, ${mem})`;
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
        ? TreeItemCollapsibleState.Expanded
        : TreeItemCollapsibleState.None;
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
