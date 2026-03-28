import React from 'react';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../../types/nodeData';
import { NodeHandles } from './_shared/NodeHandles';

const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const CoreExternalNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => (
  <>
    <NodeHandles color="!bg-orange-500" />
    <div className={`bg-white rounded-lg border-2 shadow-md px-4 py-3 min-w-[160px] max-w-[220px] transition-all duration-150 ${selected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <GlobeIcon className="w-5 h-5 text-orange-600 flex-shrink-0" />
        <span className="font-semibold text-gray-800 text-sm truncate flex-1">{data.label}</span>
        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded flex-shrink-0">EXT</span>
      </div>
      <div className="text-xs text-gray-500 mb-1">Core Externo</div>
      {data.wan_facing && <span className="inline-block text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded mt-1">WAN</span>}
      {data.management_ip && <div className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-1.5 py-0.5 mt-1 truncate">{data.management_ip}</div>}
      {data.vendor && <div className="text-xs text-gray-400 mt-1">{data.vendor}</div>}
      <div className="flex items-center gap-1 mt-2">
        {data.observable === true
          ? <><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /><span className="text-xs text-green-600">Observable</span></>
          : <><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /><span className="text-xs text-gray-400">No observable</span></>}
      </div>
    </div>
  </>
);
