import React from 'react';
import type { NodeProps } from 'reactflow';
import type { NodeData } from '../../../types/nodeData';
import { NodeHandles } from './_shared/NodeHandles';

const SwitchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
    <line x1="6" y1="12" x2="6.01" y2="12" />
    <line x1="10" y1="12" x2="10.01" y2="12" />
    <line x1="14" y1="12" x2="18" y2="12" />
  </svg>
);

export const AccessSwitchNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => (
  <>
    <NodeHandles color="!bg-gray-500" />
    <div className={`bg-white rounded-lg border-2 shadow-md px-4 py-3 min-w-[160px] max-w-[220px] transition-all duration-150 ${selected ? 'border-gray-500 ring-2 ring-gray-200' : 'border-gray-300'}`}>
      <div className="flex items-center gap-2 mb-2">
        <SwitchIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
        <span className="font-semibold text-gray-800 text-sm truncate flex-1">{data.label}</span>
        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">ACCESS</span>
      </div>
      <div className="text-xs text-gray-500 mb-1">Access Switch</div>
      {data.port_count !== undefined && <div className="text-xs text-gray-600 mt-1">Puertos: <span className="font-semibold text-gray-700">{data.port_count}</span></div>}
      {data.management_ip && <div className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-1.5 py-0.5 mt-1 truncate">{data.management_ip}</div>}
      <div className="flex items-center gap-1 mt-2">
        {data.observable === true
          ? <><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /><span className="text-xs text-green-600">Observable</span></>
          : <><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /><span className="text-xs text-gray-400">No observable</span></>}
      </div>
    </div>
  </>
);
