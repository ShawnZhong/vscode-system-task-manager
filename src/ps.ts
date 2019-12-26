/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

import * as si from "systeminformation";
import { convertBytesToLargestUnit } from "./utils";

export interface ProcessItem {
  name: string;
  command: string;
  pid: number;
  parentPid: number;
  load: string;
  mem: string;
  user: string;

  children?: ProcessItem[];
}

export async function listProcesses(): Promise<ProcessItem> {
  let rootItem: ProcessItem = {
    name: "",
    pid: 0,
    user: "",
    command: "",
    parentPid: 0,
    load: "",
    mem: ""
  };

  const data = await si.processes();
  const processes = data.list.sort((p1, p2) => p1.pid - p2.pid);
  const children = processes.map(proc => {
    const { name, pid, parentPid, command, pcpu, mem_rss, user } = proc;
    const item: ProcessItem = {
      name,
      pid,
      user,
      command,
      parentPid,
      load: `${pcpu}%`,
      mem: convertBytesToLargestUnit(mem_rss)
    };

    return item;
  });

  rootItem.children = children;

  return rootItem;
}
