"use strict";

import * as vscode from "vscode";
import { SysInfoTreeItem } from "../SysInfoTreeItem";
import { SysInfoItem } from "./SysInfoItem";

const POLL_INTERVAL = 5000;

// Modified from https://github.com/weinand/vscode-processes/blob/master/src/extension.ts
export abstract class SysInfoProvider
  implements vscode.TreeDataProvider<SysInfoTreeItem> {
  protected _root: SysInfoTreeItem;
  protected _updateTimeoutId: NodeJS.Timer;
  protected _emitter = new vscode.EventEmitter<SysInfoTreeItem>();
  readonly onDidChangeTreeData: vscode.Event<SysInfoTreeItem> = this._emitter
    .event;

  protected abstract async _getSysInfo(): Promise<SysInfoItem>;

  getTreeItem(processTreeItem: SysInfoTreeItem): SysInfoTreeItem {
    return processTreeItem;
  }

  getChildren(
    element?: SysInfoTreeItem
  ): vscode.ProviderResult<SysInfoTreeItem[]> {
    if (element) {
      return [];
    }

    if (this._root) {
      return this._root.getChildren();
    }

    this._root = new SysInfoTreeItem(0, "");
    return this._getSysInfo().then(root => {
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
    const root = await this._getSysInfo();
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
