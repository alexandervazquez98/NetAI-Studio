import React, { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../../types/nodeData';
import { NodeHandles } from './_shared/NodeHandles';

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const SdwanCPENode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <>
      <NodeHandles hovered={hovered} />
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`bg-white rounded-lg border-2 border-dashed shadow-md px-4 py-3 min-w-[170px] max-w-[230px] transition-all duration-150 ${selected ? 'border-amber-500 ring-2 ring-amber-200' : 'border-amber-400'}`}
        title="Sin acceso directo. Métricas inferidas desde SW-EXT."
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-gray-800 text-sm truncate flex-1">{data.label}</span>
          <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex-shrink-0">SD-WAN</span>
        </div>
        <div className="bg-amber-500 text-white text-xs font-bold rounded px-2 py-1 text-center mb-2">⚠ Caja Negra</div>
        {data.management_ip && <div className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-1.5 py-0.5 mt-1 truncate">{data.management_ip}</div>}
        {data.vendor && <div className="text-xs text-gray-400 mt-1">{data.vendor}</div>}
        <div className="flex items-center gap-1 mt-2" title="Sin acceso directo. Métricas inferidas desde SW-EXT.">
          <EyeSlashIcon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">No observable</span>
        </div>
        <div className="text-xs text-amber-600 mt-1 italic leading-tight">Métricas inferidas desde SW-EXT</div>
      </div>
    </>
  );
};
