import React from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import type { EdgeProps } from 'reactflow';

export const MplsEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const vrfLabel = data?.vrf ? data.vrf : null;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#3b82f6',
          strokeWidth: 3,
          ...style,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="flex flex-col items-center gap-0.5"
        >
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow">
            MPLS
          </span>
          {vrfLabel && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded shadow">
              VRF: {vrfLabel}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
