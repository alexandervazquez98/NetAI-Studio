import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  useReactFlow,
} from 'reactflow';
import type { NodeTypes, EdgeTypes } from 'reactflow';
import 'reactflow/dist/style.css';

import { useGraphStore } from '../../hooks/useGraphStore';
import { getGraph, saveGraph, exportGraph, buildSavePayload } from '../../api/graph';

import { CoreInternalNode } from './nodes/CoreInternalNode';
import { CoreExternalNode } from './nodes/CoreExternalNode';
import { AviatCTRNode } from './nodes/AviatCTRNode';
import { SdwanCPENode } from './nodes/SdwanCPENode';
import { AccessSwitchNode } from './nodes/AccessSwitchNode';
import { SiteGroup } from './SiteGroup';

import { FiberEdge } from './edges/FiberEdge';
import { MplsEdge } from './edges/MplsEdge';
import { SdwanEdge } from './edges/SdwanEdge';
import { AviatEdge } from './edges/AviatEdge';

import { ValidationModal } from './ValidationModal';
import type { ValidationResult } from './ValidationModal';
import type { NodeData } from '../../types/nodeData';
import { runValidation } from './validation';

// ── Custom node/edge type registries ─────────────────────────────────────────

const nodeTypes: NodeTypes = {
  coreInternal: CoreInternalNode,
  coreExternal: CoreExternalNode,
  aviatCTR: AviatCTRNode,
  sdwanCPE: SdwanCPENode,
  accessSwitch: AccessSwitchNode,
  siteGroup: SiteGroup,
};

const edgeTypes: EdgeTypes = {
  fiber: FiberEdge,
  mpls: MplsEdge,
  sdwan: SdwanEdge,
  aviat: AviatEdge,
};

// ── Inner canvas (needs ReactFlowProvider context) ────────────────────────────

const GraphCanvasInternal: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, selectNode, selectEdge, setGraph, isDirty, markSaved } =
    useGraphStore();
  const { screenToFlowPosition } = useReactFlow();


  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mcpJson, setMcpJson] = useState<string | null>(null);

  // ── Load topology from backend on mount ───────────────────────────────────


  useEffect(() => {
    getGraph().then((data) => {
      const siteGroupNodes = data.sites.map((s) => ({
        id: s.id,
        type: 'siteGroup' as const,
        position: { x: s.canvas_x ?? 0, y: s.canvas_y ?? 0 },
        style: { width: s.canvas_w ?? 400, height: s.canvas_h ?? 300 },
        data: {
          label: s.name,
          role: s.role,
          wan_type: s.wan_type,
          observable_boundary: s.observable_boundary,
        },
      }));

      const deviceNodes = data.nodes.map((n) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.position_x, y: n.position_y },
        data: {
          label: n.label,
          vendor: n.vendor,
          management_ip: n.management_ip,
          role: n.role,
          zone: n.zone,
          observable: n.observable,
        },
        ...(n.site_id ? { parentNode: n.site_id, extent: 'parent' as const } : {}),
      }));

      const rfEdges = data.edges.map((e) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        type: e.edge_type,
        data: { vrf: e.vrf, capacity_mbps: e.capacity_mbps },
      }));

      setGraph([...siteGroupNodes, ...deviceNodes], rfEdges);
    }).catch(() => {/* backend not ready yet, start with empty canvas */});
  }, [setGraph]);

  // ── Drag & drop from palette ──────────────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const defaultLabels: Record<string, string> = {
        coreInternal: 'Core INT',
        coreExternal: 'Core EXT',
        aviatCTR: 'Aviat CTR',
        sdwanCPE: 'SD-WAN CPE',
        accessSwitch: 'Access SW',
        siteGroup: 'Sede',
      };

      // Detect if dropped inside an existing site group
      const parentSite = type !== 'siteGroup'
        ? nodes.find((n) => {
            if (n.type !== 'siteGroup') return false;
            const w = (n.style?.width as number) ?? 400;
            const h = (n.style?.height as number) ?? 300;
            return (
              position.x >= n.position.x &&
              position.x <= n.position.x + w &&
              position.y >= n.position.y &&
              position.y <= n.position.y + h
            );
          })
        : undefined;

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position: parentSite
          ? { x: position.x - parentSite.position.x, y: position.y - parentSite.position.y }
          : position,
        data: {
          label: defaultLabels[type] ?? type,
          observable: type !== 'sdwanCPE',
        } as NodeData,
        ...(type === 'siteGroup'
          ? { style: { width: 400, height: 300 } }
          : {}),
        ...(parentSite
          ? { parentNode: parentSite.id, extent: 'parent' as const }
          : {}),
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode, nodes],
  );

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { nodes: rfNodes, edges: rfEdges } = useGraphStore.getState();
      await saveGraph(buildSavePayload(rfNodes, rfEdges));
      markSaved();
    } catch (err) {
      setSaveError('Error al guardar. Revisa la conexión con el servidor.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [markSaved]);

  // ── Validate ─────────────────────────────────────────────────────────────

  const handleValidate = useCallback(() => {
    const { nodes: n, edges: e } = useGraphStore.getState();
    const results = runValidation(n, e);
    setValidationResults(results);
  }, []);

  // ── Dirty state — warn on unload ──────────────────────────────────────────

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  return (
    <div className="relative w-full h-full" ref={reactFlowWrapper}>
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white border border-gray-200 shadow-md rounded-lg px-3 py-1.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 disabled:opacity-50 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
        >
          {saving ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          )}
          Guardar
        </button>

        {isDirty && (
          <span className="text-xs font-medium text-amber-500 flex items-center gap-1" title="Hay cambios sin guardar">
            ● sin guardar
          </span>
        )}

        <div className="w-px h-5 bg-gray-200" />

        <button
          onClick={handleValidate}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-indigo-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Validar
        </button>

        {saveError && (
          <>
            <div className="w-px h-5 bg-gray-200" />
            <span className="text-xs text-red-600">{saveError}</span>
          </>
        )}

        <div className="w-px h-5 bg-gray-200" />

        <button
          onClick={async () => {
            const data = await exportGraph();
            setMcpJson(JSON.stringify(data, null, 2));
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors px-2 py-1 rounded hover:bg-emerald-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M10 12l-2 2 2 2M14 12l2 2-2 2" />
          </svg>
          Ver JSON MCP
        </button>
      </div>

      {/* ── MCP JSON Modal ─────────────────────────────────────────────────── */}
      {mcpJson && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-800">JSON — Contexto MCP</span>
              <button
                onClick={() => setMcpJson(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="overflow-auto p-4 text-xs text-gray-800 font-mono bg-gray-50 flex-1 rounded-b-xl">
              {mcpJson}
            </pre>
          </div>
        </div>
      )}


      {/* ── ReactFlow canvas ───────────────────────────────────────────────── */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={(_event, node) => selectNode(node.id)}
        onEdgeClick={(_event, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'fiber' }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          className="!border-gray-200 !rounded-lg"
        />
      </ReactFlow>

      {/* ── Validation modal ──────────────────────────────────────────────── */}
      {validationResults !== null && (
        <ValidationModal
          results={validationResults}
          onClose={() => setValidationResults(null)}
        />
      )}
    </div>
  );
};

// ── Public export ─────────────────────────────────────────────────────────────

export const GraphCanvas: React.FC = () => <GraphCanvasInternal />;
