import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  ConnectionMode,
  useReactFlow,
} from 'reactflow';
import type { NodeTypes, EdgeTypes } from 'reactflow';
import 'reactflow/dist/style.css';

import { useGraphStore } from '../../hooks/useGraphStore';
import { saveGraph } from '../../api/graph';

import { CoreInternalNode } from './nodes/CoreInternalNode';
import { CoreExternalNode } from './nodes/CoreExternalNode';
import { AviatCTRNode } from './nodes/AviatCTRNode';
import { SdwanCPENode } from './nodes/SdwanCPENode';
import { AccessSwitchNode } from './nodes/AccessSwitchNode';
import { SiteGroup } from './SiteGroup';

import { FiberEdge } from './edges/FiberEdge';
import { MplsEdge } from './edges/MplsEdge';
import { SdwanEdge } from './edges/SdwanEdge';

import { ValidationModal } from './ValidationModal';
import type { ValidationResult } from './ValidationModal';
import type { NodeData } from '../../types/nodeData';

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
};

// ── Validation logic ─────────────────────────────────────────────────────────

function runValidation(
  nodes: ReturnType<typeof useGraphStore.getState>['nodes'],
  edges: ReturnType<typeof useGraphStore.getState>['edges'],
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Group nodes by their parentNode (site group id)
  const childrenBySite = new Map<string, typeof nodes>();
  const siteGroupIds = new Set(nodes.filter((n) => n.type === 'siteGroup').map((n) => n.id));

  for (const node of nodes) {
    const parent = (node as any).parentNode as string | undefined;
    if (parent && siteGroupIds.has(parent)) {
      const list = childrenBySite.get(parent) ?? [];
      list.push(node);
      childrenBySite.set(parent, list);
    }
  }

  // Rule 1: Each site group must have at least 1 CoreInternal and 1 CoreExternal
  for (const siteId of siteGroupIds) {
    const siteNode = nodes.find((n) => n.id === siteId);
    const children = childrenBySite.get(siteId) ?? [];
    const hasInternal = children.some((n) => n.type === 'coreInternal');
    const hasExternal = children.some((n) => n.type === 'coreExternal');

    if (!hasInternal || !hasExternal) {
      results.push({
        rule: 'Composición de sede',
        status: 'fail',
        message: `La sede "${siteNode?.data?.label ?? siteId}" debe contener al menos un Core Interno y un Core Externo.`,
        affected: [siteId],
      });
    } else {
      results.push({
        rule: 'Composición de sede',
        status: 'pass',
        message: `La sede "${siteNode?.data?.label ?? siteId}" tiene Core Interno y Core Externo.`,
        affected: [siteId],
      });
    }
  }

  // Rule 2: Each AviatCTR must have at least one connected edge
  const aviatNodes = nodes.filter((n) => n.type === 'aviatCTR');
  for (const aviat of aviatNodes) {
    const connected = edges.some((e) => e.source === aviat.id || e.target === aviat.id);
    results.push({
      rule: 'Aviat CTR conectado',
      status: connected ? 'pass' : 'fail',
      message: connected
        ? `Nodo Aviat CTR "${aviat.data?.label ?? aviat.id}" está conectado.`
        : `Nodo Aviat CTR "${aviat.data?.label ?? aviat.id}" no tiene conexiones.`,
      affected: [aviat.id],
    });
  }

  // Rule 3: SdwanCPE nodes must not have observable: true
  const sdwanNodes = nodes.filter((n) => n.type === 'sdwanCPE');
  for (const cpe of sdwanNodes) {
    const nodeData = cpe.data as NodeData;
    if (nodeData.observable === true) {
      results.push({
        rule: 'SD-WAN CPE no observable',
        status: 'warn',
        message: `Nodo SD-WAN CPE "${nodeData.label ?? cpe.id}" tiene observable=true. Debería ser caja negra.`,
        affected: [cpe.id],
      });
    } else {
      results.push({
        rule: 'SD-WAN CPE no observable',
        status: 'pass',
        message: `Nodo SD-WAN CPE "${nodeData.label ?? cpe.id}" correctamente marcado como caja negra.`,
        affected: [cpe.id],
      });
    }
  }

  // If no site groups at all, add info
  if (siteGroupIds.size === 0) {
    results.push({
      rule: 'Composición de sede',
      status: 'warn',
      message: 'No hay grupos de sede en el canvas.',
    });
  }

  return results;
}

// ── Inner canvas (needs ReactFlowProvider context) ────────────────────────────

const GraphCanvasInternal: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, selectNode, selectEdge } =
    useGraphStore();
  const { screenToFlowPosition } = useReactFlow();

  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: defaultLabels[type] ?? type,
          observable: type !== 'sdwanCPE',
        } as NodeData,
        // Site groups use extent + style
        ...(type === 'siteGroup'
          ? {
              style: { width: 400, height: 300 },
            }
          : {}),
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { nodes: rfNodes, edges: rfEdges } = useGraphStore.getState();
      // Convert ReactFlow nodes/edges to TopologyGraphSchema for the API
      const payload = {
        sites: [],
        nodes: rfNodes.map((n) => ({
          id: n.id,
          site_id: n.data?.siteId ?? '',
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
        edges: rfEdges.map((e) => ({
          id: e.id,
          source_id: e.source,
          target_id: e.target,
          edge_type: e.type ?? 'fiber',
          vrf: e.data?.vrf ?? null,
          capacity_mbps: e.data?.capacity_mbps ?? null,
        })),
      };
      await saveGraph(payload);
    } catch (err) {
      setSaveError('Error al guardar. Revisa la conexión con el servidor.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Validate ─────────────────────────────────────────────────────────────

  const handleValidate = useCallback(() => {
    const { nodes: n, edges: e } = useGraphStore.getState();
    const results = runValidation(n, e);
    setValidationResults(results);
  }, []);

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
      </div>

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

// ── Public export (wrapped in provider) ──────────────────────────────────────

export const GraphCanvas: React.FC = () => (
  <ReactFlowProvider>
    <GraphCanvasInternal />
  </ReactFlowProvider>
);
