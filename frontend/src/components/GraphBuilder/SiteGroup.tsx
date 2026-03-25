import React, { useState } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../types/nodeData';

export const SiteGroup: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  const [collapsed, setCollapsed] = useState<boolean>(data.collapsed ?? false);

  const wanType = data.wan_type;
  const nodeCount = data.nodeCount;

  return (
    <>
      <NodeResizer
        isVisible={selected && !collapsed}
        minWidth={220}
        minHeight={160}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1' }}
        lineStyle={{ border: '1.5px dashed #6366f1' }}
      />

      <div
        className={`
          rounded-xl border-2 transition-all duration-200 overflow-hidden
          ${collapsed
            ? 'border-indigo-300 bg-indigo-50/60'
            : 'border-indigo-300 bg-indigo-50/30 shadow-sm'
          }
          ${selected ? 'ring-2 ring-indigo-300' : ''}
          w-full h-full
        `}
        style={{ minWidth: collapsed ? 220 : undefined, minHeight: collapsed ? 40 : undefined }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-100/70 border-b border-indigo-200">
          {/* Site name */}
          <span className="font-semibold text-indigo-900 text-sm flex-1 truncate">
            {data.label || 'Sede'}
          </span>

          {/* WAN type badge */}
          {wanType === 'MPLS' && (
            <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
              MPLS
            </span>
          )}
          {wanType === 'SD-WAN' && (
            <span className="text-xs font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">
              SD-WAN
            </span>
          )}
          {wanType === 'aviat_carrier' && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Aviat
            </span>
          )}

          {/* Node count badge */}
          {nodeCount !== undefined && (
            <span className="text-xs bg-indigo-200 text-indigo-800 font-medium px-1.5 py-0.5 rounded">
              {nodeCount} nodo{nodeCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Collapse / Expand toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-1 p-0.5 rounded hover:bg-indigo-200 text-indigo-700 transition-colors"
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? (
              /* Chevron down */
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              /* Chevron up */
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Body — hidden when collapsed */}
        {!collapsed && (
          <div className="w-full h-[calc(100%-40px)]">
            {/* Child nodes are rendered by ReactFlow over this area */}
          </div>
        )}
      </div>

      {/* Connection handles */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
};
