"use strict";

import { ProviderResult, TreeDataProvider, EventEmitter, Event } from "vscode";
import {
  processes as getProcesses,
  Systeminformation
} from "systeminformation";

import { processViewer } from "./extension";
import { ProcessTreeItem } from "./ProcessTreeItem";

const POLL_INTERVAL = 1000;

export interface ProcessItem extends Systeminformation.ProcessesProcessData {
  children?: ProcessItem[];
}

export async function listProcesses(): Promise<ProcessItem> {
  const data = await getProcesses();
  const processes = data.list.sort((p1, p2) => p1.pid - p2.pid);

  const root = {} as ProcessItem;
  root.children = processes;
  return root;
}

export class ProcessProvider implements TreeDataProvider<ProcessTreeItem> {
  private _root: ProcessTreeItem;
  private _updateTimeoutId: NodeJS.Timer;
  private _emitter = new EventEmitter<ProcessTreeItem>();
  readonly onDidChangeTreeData: Event<ProcessTreeItem> = this._emitter.event;

  getTreeItem(processTreeItem: ProcessTreeItem): ProcessTreeItem {
    return processTreeItem;
  }

  getParent(element: ProcessTreeItem): ProcessTreeItem {
    return element._parent;
  }

  getChildren(element?: ProcessTreeItem): ProviderResult<ProcessTreeItem[]> {
    if (element) {
      return [];
    }

    if (this._root) {
      return this._root.getChildren();
    }

    this._root = new ProcessTreeItem(undefined, 0);
    return listProcesses().then(root => {
      this._root.merge(root);
      return this._root.getChildren();
    });
  }

  stopUpdate() {
    clearTimeout(this._updateTimeoutId);
  }

  startUpdate() {
    this.update();
    this._updateTimeoutId = setTimeout(() => this.startUpdate(), POLL_INTERVAL);
  }

  async update() {
    console.log(`Updated ${new Date().toLocaleTimeString()}`);
    const root = await listProcesses();
    let processTreeItem = this._root.merge(root);

    if (processTreeItem) {
      // workaround for https://github.com/Microsoft/vscode/issues/40185
      if (processTreeItem === this._root) {
        processTreeItem = undefined;
      }
      this._emitter.fire(processTreeItem);
    }
  }
}
