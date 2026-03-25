import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import type {
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';
import type { NodeData } from '../types/nodeData';
import type { GraphData } from '../types/graph';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // ReactFlow change handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Selection
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;

  // Mutations
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  updateEdge: (id: string, patch: Partial<Pick<Edge, 'type' | 'data'>>) => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
  setGraph: (nodes: Node[], edges: Edge[]) => void;
  addNode: (node: Node) => void;

  // Legacy helpers kept for backward compatibility
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  getGraphData: () => GraphData;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,

  // ── ReactFlow change handlers ────────────────────────────────────────────

  onNodesChange: (changes) => {
    // When ReactFlow removes a siteGroup (e.g. Delete key), also remove its children
    const removedIds = changes
      .filter((c) => c.type === 'remove')
      .map((c) => c.id);
    const childIds = removedIds.length
      ? get().nodes
          .filter((n) => removedIds.includes((n as any).parentNode))
          .map((n) => n.id)
      : [];
    const allRemovedIds = [...removedIds, ...childIds];
    const updatedNodes = applyNodeChanges(
      changes,
      get().nodes.filter((n) => !childIds.includes(n.id)),
    );
    set({
      nodes: updatedNodes,
      edges: allRemovedIds.length
        ? get().edges.filter((e) => !allRemovedIds.includes(e.source) && !allRemovedIds.includes(e.target))
        : get().edges,
    });
  },

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection: Connection) =>
    set({ edges: addEdge(connection, get().edges) }),

  // ── Selection ────────────────────────────────────────────────────────────

  selectNode: (id) =>
    set({ selectedNodeId: id, selectedEdgeId: null }),

  selectEdge: (id) =>
    set({ selectedEdgeId: id, selectedNodeId: null }),

  // ── Mutations ────────────────────────────────────────────────────────────

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }),

  updateEdge: (id, patch) =>
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    }),

  deleteNode: (id) => {
    // Also remove children if deleting a siteGroup
    const childIds = get().nodes
      .filter((n) => (n as any).parentNode === id)
      .map((n) => n.id);
    const allIds = [id, ...childIds];

    // Build remove changes for all IDs (parent + children) so ReactFlow's
    // internal state stays in sync (required in controlled mode, RF v11).
    const removeChanges = allIds.map((nodeId) => ({ type: 'remove' as const, id: nodeId }));
    const updatedNodes = applyNodeChanges(removeChanges, get().nodes);

    set({
      nodes: updatedNodes,
      edges: get().edges.filter((e) => !allIds.includes(e.source) && !allIds.includes(e.target)),
      selectedNodeId: allIds.includes(get().selectedNodeId ?? '') ? null : get().selectedNodeId,
    });
  },

  deleteEdge: (id) => {
    // Use applyEdgeChanges so ReactFlow's internal state stays in sync.
    const updatedEdges = applyEdgeChanges([{ type: 'remove', id }], get().edges);
    set({
      edges: updatedEdges,
      selectedEdgeId: get().selectedEdgeId === id ? null : get().selectedEdgeId,
    });
  },

  setGraph: (nodes, edges) => set({ nodes, edges }),

  addNode: (node) => set({ nodes: [...get().nodes, node] }),

  // ── Legacy helpers ────────────────────────────────────────────────────────

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  getGraphData: (): GraphData => ({
    nodes: get().nodes.map((n) => ({
      id: n.id,
      type: n.type as any,
      position: n.position,
      data: n.data,
      siteId: n.data?.siteId,
    })),
    edges: get().edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      data: e.data,
    })),
    sites: [],
  }),
}));
