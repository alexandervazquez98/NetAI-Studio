import React, { useState } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { buildEdgeAnimation } from './_edgeAnimation';

export const AviatEdge: React.FC<EdgeProps> = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd, style,
}) => {
  const [hovered, setHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const { css } = buildEdgeAnimation({ animId: id, color: '#d97706', width: 2, dash: '8 4', duration: '1s' });

  return (
    <>
      <style>{css}</style>

      {/* hit area */}
      <path data-testid="aviat-hit-path" d={edgePath} fill="none"
        stroke="transparent" strokeWidth={12}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }} />

      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd}
        style={{ stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '8 4', ...style }} />

      {/* animated orange-amber pulses */}
      <path className={`edge-anim-${id}`} d={edgePath} fill="none"
        stroke="#d97706" strokeWidth={2} strokeDasharray="8 4" pointerEvents="none" />

      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none' }}
          className="flex flex-col items-center gap-0.5">
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded shadow">Aviat</span>
          {hovered && <span className="bg-gray-700 text-white text-xs font-medium px-2 py-0.5 rounded shadow-lg">Microonda</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
