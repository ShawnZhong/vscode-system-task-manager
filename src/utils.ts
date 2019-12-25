"use strict";

enum Units {
  B = 1,
  KB = 1024,
  MB = 1024 * 1024,
  GB = 1024 * 1024 * 1024
}

// Got from https://github.com/Njanderson/resmon/blob/master/src/extension.ts

export function convertBytesToLargestUnit(
  bytes: number,
  precision: number = 2
): string {
  let unit: Units = Units.B;
  while (bytes / unit >= 1024 && unit < Units.GB) {
    unit *= 1024;
  }
  return `${(bytes / unit).toFixed(precision)} ${Units[unit]}`;
}
