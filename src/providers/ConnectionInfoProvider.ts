"use strict";

import * as si from "systeminformation";
import { SysInfoItem, SysInfoProvider } from ".";

export class ConnectionInfoProvider extends SysInfoProvider {
  async _getSysInfo(): Promise<SysInfoItem> {
    const data = await si.networkConnections();

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

      processes[connection.localport] = { id, pid, tooltip, label };
    });

    const root = {} as SysInfoItem;
    root.children = Object.values(processes);

    return root;
  }
}
