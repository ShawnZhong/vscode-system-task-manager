export interface SysInfoItem {
  id: string;
  pid: number;
  tooltip: string;
  label: string;
  children?: SysInfoItem[];
}
