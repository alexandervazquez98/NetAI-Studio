import React from 'react';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../../types/nodeData';
import { NodeHandles } from './_shared/NodeHandles';

const ServerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);

export const CoreInternalNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => (
  <>
    <NodeHandles color="!bg-blue-500" />
    <div className={`bg-white rounded-lg border-2 shadow-md px-4 py-3 min-w-[160px] max-w-[220px] transition-all duration-150 ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <ServerIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <span className="font-semibold text-gray-800 text-sm truncate flex-1">{data.label}</span>
        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0">INT</span>
      </div>
      <div className="text-xs text-gray-500 mb-1">Core Interno</div>
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
