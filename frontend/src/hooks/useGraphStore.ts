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
  deleteNode: (id: string) => void;
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

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

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

  deleteNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    }),

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
