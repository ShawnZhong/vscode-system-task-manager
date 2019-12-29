"use strict";

import { ProviderResult, TreeDataProvider, EventEmitter, Event } from "vscode";
import {
  processes as getProcesses,
  networkConnections as getConnections,
  Systeminformation as si
} from "systeminformation";

import { SysInfoTreeItem } from "./ProcessTreeItem";
import { convertBytesToLargestUnit } from "./utils";

const POLL_INTERVAL = 1000;

export interface SysInfoItem {
  id: string;
  pid: number;
  tooltip: string;
  label: string;
  children?: SysInfoItem[];
}

abstract class SysInfoProvider implements TreeDataProvider<SysInfoTreeItem> {
  protected _root: SysInfoTreeItem;
  protected _updateTimeoutId: NodeJS.Timer;
  protected _emitter = new EventEmitter<SysInfoTreeItem>();
  readonly onDidChangeTreeData: Event<SysInfoTreeItem> = this._emitter.event;

  protected abstract async _getSysInfo(): Promise<SysInfoItem>;

  getTreeItem(processTreeItem: SysInfoTreeItem): SysInfoTreeItem {
    return processTreeItem;
  }

  getParent(element: SysInfoTreeItem): SysInfoTreeItem {
    return element._parent;
  }

  getChildren(element?: SysInfoTreeItem): ProviderResult<SysInfoTreeItem[]> {
    if (element) {
      return [];
    }

    if (this._root) {
      return this._root.getChildren();
    }

    this._root = new SysInfoTreeItem(undefined, 0, "");
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

export class ProcessProvider extends SysInfoProvider {
  async _getSysInfo(): Promise<SysInfoItem> {
    const data = await getProcesses();
    const processes = data.list
      .sort((p1, p2) => p1.pid - p2.pid)
      .map(process => {
        const { name, user, started, pid } = process;

        const id = pid.toString();
        const load = `${process.pcpu}%`;
        const mem = convertBytesToLargestUnit(process.mem_rss);
        const label = `${name} (${load}, ${mem})`;
        const tooltip = [
          `Process: ${name} (${pid})`,
          `CPU Load: ${load}`,
          `Memory: ${mem}`,
          `User: ${user}`,
          `Start Time: ${started}`
        ].join("\n");

        return { id, pid, tooltip, label } as SysInfoItem;
      });

    const root = {} as SysInfoItem;
    root.children = processes;
    return root;
  }
}

export class ConnectionProvider extends SysInfoProvider {
  async _getSysInfo(): Promise<SysInfoItem> {
    const data = await getConnections();

    const processes: { [id: string]: SysInfoItem } = {};

    data.forEach(connection => {
      const {
        process,
        pid,
        localaddress,
        localport,
        peeraddress,
        peerport,
        state,
        protocol
      } = connection;

      const tooltip = [
        process ? `Procrss: ${process} (${pid})` : `PID: ${pid}`,
        `Local: ${localaddress}:${localport}`,
        `Remote: ${peeraddress}:${peerport}`,
        `Protocal: ${protocol}`,
        `State: ${state}`
      ].join("\n");
      const label = `Port ${localport}: ${state}`;
      const id = label;

      const sysInfoItem: SysInfoItem = { id, pid, tooltip, label };
      processes[connection.localport] = sysInfoItem;
    });

    const root = {} as SysInfoItem;
    root.children = Object.values(processes);

    return root;
  }
}
