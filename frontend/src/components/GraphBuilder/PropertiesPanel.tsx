import React from 'react';
import { useGraphStore } from '../../hooks/useGraphStore';
import type { NodeData } from '../../types/nodeData';

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;

const NODE_TYPE_ROLE_MAP: Record<string, string> = {
  coreInternal: 'Core Interno',
  coreExternal: 'Core Externo',
  aviatCTR: 'Aviat CTR',
  sdwanCPE: 'SD-WAN CPE',
  accessSwitch: 'Access Switch',
  siteGroup: 'Sede (Grupo)',
};

const SWITCH_TYPES = new Set(['accessSwitch', 'coreInternal', 'coreExternal']);

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
      {label}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition';

export const PropertiesPanel: React.FC = () => {
  const { nodes, edges, selectedNodeId, selectedEdgeId, updateNodeData, updateEdge, deleteEdge, deleteNode } = useGraphStore();

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId) ?? null
    : null;

  // ── Edge panel ────────────────────────────────────────────────────────────

  if (selectedEdge && !selectedNode) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="mb-4 pb-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Propiedades del Enlace</h2>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedEdge.id}</p>
        </div>

        <Field label="Tipo de enlace">
          <select
            className={inputCls}
            value={selectedEdge.type ?? 'fiber'}
            aria-label="Tipo de enlace"
            onChange={(e) => updateEdge(selectedEdge.id, { type: e.target.value })}
          >
            <option value="fiber">Fibra</option>
            <option value="mpls">MPLS</option>
            <option value="sdwan">SD-WAN</option>
            <option value="aviat">Microonda (Aviat)</option>
          </select>
        </Field>

        <Field label="Origen">
          <div className="text-sm bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-600 font-mono truncate">
            {nodes.find((n) => n.id === selectedEdge.source)?.data?.label ?? selectedEdge.source}
          </div>
        </Field>

        <Field label="Destino">
          <div className="text-sm bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-600 font-mono truncate">
            {nodes.find((n) => n.id === selectedEdge.target)?.data?.label ?? selectedEdge.target}
          </div>
        </Field>

        {selectedEdge.data?.vrf && (
          <Field label="VRF">
            <div className="text-sm bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-600 font-mono">
              {selectedEdge.data.vrf}
            </div>
          </Field>
        )}

        {selectedEdge.data?.capacity_mbps && (
          <Field label="Capacidad (Mbps)">
            <div className="text-sm bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-600">
              {selectedEdge.data.capacity_mbps} Mbps
            </div>
          </Field>
        )}

        <div className="flex-1" />

        <div className="pt-4 border-t border-gray-100 mt-4">
          <button
            className="w-full text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded px-3 py-2 transition-colors"
            onClick={() => deleteEdge(selectedEdge.id)}
          >
            Eliminar enlace
          </button>
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 px-4">
        <svg
          className="w-12 h-12 mb-3 text-gray-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 9h6M9 12h6M9 15h4" />
        </svg>
        <p className="text-sm text-center leading-snug">
          Selecciona un nodo o enlace para ver sus propiedades
        </p>
      </div>
    );
  }

  const data = selectedNode.data as NodeData;
  const nodeType = selectedNode.type ?? '';
  const role = NODE_TYPE_ROLE_MAP[nodeType] ?? nodeType;
  const isSwitch = SWITCH_TYPES.has(nodeType);
  const isSdwanCPE = nodeType === 'sdwanCPE';

  const patch = (key: keyof NodeData, value: unknown) => {
    updateNodeData(selectedNode.id, { [key]: value } as Partial<NodeData>);
  };

  const ipError =
    data.management_ip && !IP_REGEX.test(data.management_ip)
      ? 'Formato IP inválido (ej: 192.168.1.1 o 10.0.0.1/24)'
      : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Panel header */}
      <div className="mb-4 pb-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">Propiedades del Nodo</h2>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedNode.id}</p>
      </div>

      {/* label */}
      <Field label="Nombre (label)">
        <input
          className={inputCls}
          type="text"
          value={data.label ?? ''}
          onChange={(e) => patch('label', e.target.value)}
          placeholder="Nombre del nodo"
        />
      </Field>

      {/* management_ip */}
      {nodeType !== 'siteGroup' && (
        <Field label="Management IP">
          <input
            className={`${inputCls} font-mono ${ipError ? 'border-red-400 focus:ring-red-300' : ''}`}
            type="text"
            value={data.management_ip ?? ''}
            onChange={(e) => patch('management_ip', e.target.value)}
            placeholder="192.168.1.1"
          />
          {ipError && (
            <p className="text-xs text-red-500 mt-0.5">{ipError}</p>
          )}
        </Field>
      )}

      {/* vendor */}
      {nodeType !== 'siteGroup' && (
        <Field label="Vendor">
          <select
            className={inputCls}
            value={data.vendor ?? ''}
            onChange={(e) => patch('vendor', e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            <option value="Cisco">Cisco</option>
            <option value="Aviat">Aviat</option>
            <option value="Unknown">Unknown</option>
          </select>
        </Field>
      )}

      {/* role — read-only */}
      <Field label="Rol">
        <div className="text-sm bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-gray-600">
          {role}
        </div>
      </Field>

      {/* zone */}
      {nodeType !== 'siteGroup' && (
        <Field label="Zona">
          <select
            className={inputCls}
            value={data.zone ?? ''}
            onChange={(e) => patch('zone', e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            <option value="planta_interna">Planta Interna</option>
            <option value="planta_externa">Planta Externa</option>
          </select>
        </Field>
      )}

      {/* observable toggle — not shown for SdwanCPE (it's always false) */}
      {!isSdwanCPE && nodeType !== 'siteGroup' && (
        <Field label="Observable">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={!!data.observable}
              onClick={() => patch('observable', !data.observable)}
              className={`
                relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300
                ${data.observable ? 'bg-green-500' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${data.observable ? 'translate-x-4' : 'translate-x-0.5'}
                `}
              />
            </button>
            <span className="text-sm text-gray-600">
              {data.observable ? 'Sí' : 'No'}
            </span>
          </div>

          {data.observable === false && (
            <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-1.5 leading-snug">
              ⚠ Este nodo será tratado como <strong>caja negra</strong>. Las métricas serán inferidas.
            </div>
          )}
        </Field>
      )}

      {/* vlan_list — only for switch types */}
      {isSwitch && (
        <Field label="VLAN List (separadas por coma)">
          <textarea
            className={`${inputCls} resize-none h-20 font-mono`}
            value={(data.vlan_list ?? []).join(', ')}
            onChange={(e) => {
              const raw = e.target.value;
              const list = raw
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
              patch('vlan_list', list);
            }}
            placeholder="10, 20, 100, 200"
          />
        </Field>
      )}

      {/* wan_type for site group */}
      {nodeType === 'siteGroup' && (
        <Field label="Tipo WAN">
          <select
            className={inputCls}
            value={data.wan_type ?? ''}
            aria-label="Tipo WAN"
            onChange={(e) => patch('wan_type', e.target.value as NodeData['wan_type'])}
          >
            <option value="">— Seleccionar —</option>
            <option value="MPLS">MPLS</option>
            <option value="SD-WAN">SD-WAN</option>
            <option value="aviat_carrier">Aviat Carrier</option>
          </select>
        </Field>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Delete button */}
      <div className="pt-4 border-t border-gray-100 mt-4">
        <button
          className="w-full text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded px-3 py-2 transition-colors"
          onClick={() => deleteNode(selectedNode.id)}
        >
          {nodeType === 'siteGroup' ? 'Eliminar sede y sus equipos' : 'Eliminar nodo'}
        </button>
      </div>
    </div>
  );
};
