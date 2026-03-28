export interface SiteSchema {
  id: string;
  name: string;
  role: string;
  wan_type: string;
  observable_boundary: string | null;
  canvas_x: number | null;
  canvas_y: number | null;
  canvas_w: number | null;
  canvas_h: number | null;
}

export interface NetworkNodeSchema {
  id: string;
  site_id: string;
  label: string;
  node_type: string;
  vendor: string;
  management_ip: string | null;
  role: string | null;
  zone: string | null;
  observable: boolean;
  position_x: number;
  position_y: number;
  meta: Record<string, unknown>;
}

export interface NetworkEdgeSchema {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: string;
  vrf: string | null;
  capacity_mbps: number | null;
}

export interface TopologyGraphSchema {
  sites: SiteSchema[];
  nodes: NetworkNodeSchema[];
  edges: NetworkEdgeSchema[];
}
