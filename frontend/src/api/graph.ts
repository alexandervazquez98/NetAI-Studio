import apiClient from './client';
import type { Node, Edge } from 'reactflow';
import type { TopologyGraphSchema } from '../types/api';

// ── Payload builder (pure) ────────────────────────────────────────────────────
// Shared by GraphCanvas (manual save) and PropertiesPanel (auto-save on delete).

export function buildSavePayload(nodes: Node[], edges: Edge[]): TopologyGraphSchema {
  const siteNodes = nodes.filter((n) => n.type === 'siteGroup');
  const regularNodes = nodes.filter((n) => n.type !== 'siteGroup');
  return {
    sites: siteNodes.map((n) => ({
      id: n.id,
      name: n.data?.label ?? n.id,
      role: n.data?.role ?? 'spoke',
      wan_type: n.data?.wan_type ?? 'mpls_aviat',
      observable_boundary: n.data?.observable_boundary ?? null,
      canvas_x: n.position.x,
      canvas_y: n.position.y,
      canvas_w: (n.style?.width as number) ?? 400,
      canvas_h: (n.style?.height as number) ?? 300,
    })),
    nodes: regularNodes.map((n) => ({
      id: n.id,
      site_id: (n as any).parentNode ?? n.data?.siteId ?? '',
      label: n.data?.label ?? n.id,
      node_type: n.type ?? 'access_switch',
      vendor: n.data?.vendor ?? 'Cisco',
      management_ip: n.data?.management_ip ?? null,
      role: n.data?.role ?? null,
      zone: n.data?.zone ?? null,
      observable: n.data?.observable ?? true,
      position_x: n.position.x,
      position_y: n.position.y,
      meta: {},
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source_id: e.source,
      target_id: e.target,
      edge_type: e.type ?? 'fiber',
      vrf: e.data?.vrf ?? null,
      capacity_mbps: e.data?.capacity_mbps ?? null,
    })),
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const getGraph = async (): Promise<TopologyGraphSchema> => {
  const res = await apiClient.get<TopologyGraphSchema>('/api/graph/');
  return res.data;
};

export const saveGraph = async (graph: TopologyGraphSchema): Promise<void> => {
  await apiClient.post('/api/graph/', graph);
};

export const updateNode = async (nodeId: string, data: Partial<unknown>): Promise<void> => {
  await apiClient.put(`/api/graph/nodes/${nodeId}`, data);
};

export const deleteNode = async (nodeId: string): Promise<void> => {
  await apiClient.delete(`/api/graph/nodes/${nodeId}`);
};

export const exportGraph = async (): Promise<unknown> => {
  const res = await apiClient.get('/api/graph/export');
  return res.data;
};
