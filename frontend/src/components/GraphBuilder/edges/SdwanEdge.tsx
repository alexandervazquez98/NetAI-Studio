import React from 'react';
import { getStraightPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { buildEdgeAnimation } from './_edgeAnimation';

export const SdwanEdge: React.FC<EdgeProps> = ({
  id, sourceX, sourceY, targetX, targetY, markerEnd, style,
}) => {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const { css } = buildEdgeAnimation({ animId: id, color: '#f59e0b', width: 2, dash: '5 5', duration: '0.9s' });

  return (
    <>
      <style>{css}</style>

      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd}
        style={{ stroke: '#fcd34d', strokeWidth: 2, strokeDasharray: '5 5', ...style }} />

      {/* animated amber pulses */}
      <path className={`edge-anim-${id}`} d={edgePath} fill="none"
        stroke="#d97706" strokeWidth={2} strokeDasharray="5 5" pointerEvents="none" />

      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none' }}>
          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded shadow">SD-WAN</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
