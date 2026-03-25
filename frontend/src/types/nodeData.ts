export interface NodeData {
  label: string;
  management_ip?: string;
  vendor?: string;
  role?: string;
  zone?: string;
  observable?: boolean;
  signal_dbm?: number;
  wan_links?: string[];
  port_count?: number;
  vlan_list?: string[];
  wan_facing?: boolean;
  vrf?: string;
  site?: string;
  // SiteGroup specific
  wan_type?: 'MPLS' | 'SD-WAN';
  collapsed?: boolean;
  nodeCount?: number;
}
