export type NodeType = 'site' | 'device' | 'link';

export interface NodePosition {
  x: number;
  y: number;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  data: Record<string, any>;
  siteId?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, any>;
}

export interface SiteGroup {
  id: string;
  name: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  sites: SiteGroup[];
}
