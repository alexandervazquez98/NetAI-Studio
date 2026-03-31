import React from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge, useStore } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { buildEdgeAnimation } from './_edgeAnimation';
import { getFloatingEdgeParams } from './_floatingEdge';

export const MplsEdge: React.FC<EdgeProps> = ({ id, source, target, data, markerEnd, style }) => {
  const sourceNode = useStore((s) => s.nodeInternals.get(source));
  const targetNode = useStore((s) => s.nodeInternals.get(target));

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(sourceNode, targetNode);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx, sourceY: sy, sourcePosition: sourcePos,
    targetX: tx, targetY: ty, targetPosition: targetPos,
  });

  const { css } = buildEdgeAnimation({ animId: id, color: '#3b82f6', width: 3, dash: '10 4', duration: '1s' });
  const vrfLabel = data?.vrf ?? null;

  return (
    <>
      <style>{css}</style>

      {/* base thick line */}
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd}
        style={{ stroke: '#93c5fd', strokeWidth: 3, ...style }} />

      {/* animated overlay — brighter blue flowing dots */}
      <path className={`edge-anim-${id}`} d={edgePath} fill="none"
        stroke="#2563eb" strokeWidth={3} strokeDasharray="10 4" pointerEvents="none" />

      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none' }}
          className="flex flex-col items-center gap-0.5">
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow">MPLS</span>
          {vrfLabel && <span className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded shadow">VRF: {vrfLabel}</span>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
