/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

import {
  processes as getProcesses,
  Systeminformation
} from "systeminformation";

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
