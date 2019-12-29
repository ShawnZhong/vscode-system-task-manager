"use strict";

import * as si from "systeminformation";
import { convertBytesToLargestUnit } from "../utils";
import { SysInfoItem } from "./SysInfoItem";
import { SysInfoProvider } from "./SysInfoProvider";

export class ProcessInfoProvider extends SysInfoProvider {
  async _getSysInfo(): Promise<SysInfoItem> {
    const data = await si.processes();
    const processes = data.list
      .sort((p1, p2) => p1.pid - p2.pid)
      .map(process => {
        const { name, user, started, pid, command, params } = process;

        const id = pid.toString();
        const load = `${process.pcpu}%`;
        const mem = convertBytesToLargestUnit(process.mem_rss);
        const label = `${name} (${load}, ${mem})`;
        const tooltip = [
          `Process: ${name} (${pid})`,
          `CPU Load: ${load}`,
          `Memory: ${mem}`,
          `User: ${user}`,
          `Start Time: ${started}`,
          `Command: ${command} ${params}`
        ].join("\n");

        return { id, pid, tooltip, label } as SysInfoItem;
      });

    const root = {} as SysInfoItem;
    root.children = processes;
    return root;
  }
}
