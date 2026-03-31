import React, { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../../types/nodeData';
import { NodeHandles } from './_shared/NodeHandles';

const WifiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const AviatCTRNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <>
      <NodeHandles hovered={hovered} />
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`bg-white rounded-lg border-2 shadow-md px-4 py-3 min-w-[160px] max-w-[220px] transition-all duration-150 ${selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'}`}
      >
        <div className="flex items-center gap-2 mb-2">
          <WifiIcon className="w-5 h-5 text-purple-600 flex-shrink-0" />
          <span className="font-semibold text-gray-800 text-sm truncate flex-1">{data.label}</span>
          <span className="text-xs font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded flex-shrink-0">CTR</span>
        </div>
        <div className="text-xs text-gray-500 mb-1">Aviat CTR</div>
        {data.signal_dbm !== undefined && data.signal_dbm !== null && (
          <div className="flex items-center gap-1 mt-1">
            <WifiIcon className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-gray-600">{data.signal_dbm} dBm</span>
          </div>
        )}
        {data.wan_links !== undefined && <div className="text-xs text-gray-600 mt-1">WAN links: <span className="font-semibold text-purple-700">{data.wan_links.length}</span></div>}
        <div className="flex items-center gap-1 mt-2">
          <EyeIcon className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs text-green-600 font-medium">Observable</span>
        </div>
      </div>
    </>
  );
};
