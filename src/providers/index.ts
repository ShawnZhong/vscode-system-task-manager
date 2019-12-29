export * from "./ProcessInfoProvider";
export * from "./ConnectionInfoProvider";
export * from "./SysInfoProvider";

export interface SysInfoItem {
  id: string;
  pid: number;
  tooltip: string;
  label: string;
  children?: SysInfoItem[];
}
