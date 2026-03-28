import React, { useState } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { buildEdgeAnimation } from './_edgeAnimation';

export const FiberEdge: React.FC<EdgeProps> = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd, style,
}) => {
  const [hovered, setHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const { css } = buildEdgeAnimation({ animId: id, color: '#6b7280', width: 2, dash: '6 4', duration: '1.4s' });

  return (
    <>
      <style>{css}</style>

      {/* hit area */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={12}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }} />

      {/* base line */}
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd}
        style={{ stroke: '#9ca3af', strokeWidth: 2, ...style }} />

      {/* animated overlay */}
      <path className={`edge-anim-${id}`} d={edgePath} fill="none"
        stroke="#6b7280" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />

      {hovered && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none' }}
            className="bg-gray-700 text-white text-xs font-medium px-2 py-0.5 rounded shadow-lg">
            Fibra LAN
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
