import React, { useState } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge, useStore } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { buildEdgeAnimation } from './_edgeAnimation';
import { getFloatingEdgeParams } from './_floatingEdge';

export const FiberEdge: React.FC<EdgeProps> = ({ id, source, target, markerEnd, style }) => {
  const [hovered, setHovered] = useState(false);

  // Read live node positions from the ReactFlow store so the edge
  // re-routes automatically when nodes move — regardless of which
  // handle was used to create the connection.
  const sourceNode = useStore((s) => s.nodeInternals.get(source));
  const targetNode = useStore((s) => s.nodeInternals.get(target));

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(sourceNode, targetNode);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx, sourceY: sy, sourcePosition: sourcePos,
    targetX: tx, targetY: ty, targetPosition: targetPos,
  });

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
