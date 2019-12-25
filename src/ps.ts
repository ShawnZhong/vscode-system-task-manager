/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

import { spawn, ChildProcess } from "child_process";
import * as si from "systeminformation";
import {convertBytesToLargestUnit} from "./utils"
import { totalmem } from "os";

export interface ProcessItem {
  name: string;
  cmd: string;
  pid: number;
  ppid: number;
  load: string;
  mem: string;
  user: string;

  children?: ProcessItem[];
}

export async function listProcesses(
  rootPid: number,
  withLoad: boolean
): Promise<ProcessItem> {
  let rootItem: ProcessItem;
  const map = new Map<number, ProcessItem>();

  function addToTree(
    name: string,
    pid: number,
    ppid: number,
    cmd: string,
    load: string,
    mem: string,
    user: string
  ) {
    
  }

  const data = await si.processes();
  const processes = data.list.sort((p1, p2) => p1.pid-p2.pid);
  processes.forEach(proc => {
    const {name, pid, parentPid, command, pcpu, mem_rss, user} = proc;

    const parent = map.get(parentPid);
    if (pid === rootPid || parent) {
      const item: ProcessItem = {
        name,
        pid,
        user,
        cmd: command,
        ppid: parentPid,
        load: `${pcpu}%`,
        mem: convertBytesToLargestUnit(mem_rss),
      };
      map.set(pid, item);

      if (pid === rootPid) {
        rootItem = item;
      }

      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      }
    }


  });

  

  return rootItem;
}


