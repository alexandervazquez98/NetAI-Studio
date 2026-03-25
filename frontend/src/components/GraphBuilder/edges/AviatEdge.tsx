import React, { useState } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import type { EdgeProps } from 'reactflow';

const AVIAT_ANIMATION_ID = 'aviat-dash-anim';

export const AviatEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}) => {
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Inline CSS animation for dashed stroke */}
      <style>{`
        @keyframes dashMove {
          from { stroke-dashoffset: 24; }
          to   { stroke-dashoffset: 0;  }
        }
        #${AVIAT_ANIMATION_ID}-${id} {
          animation: dashMove 1s linear infinite;
        }
      `}</style>

      {/* Invisible wider path for easier hover detection */}
      <path
        data-testid="aviat-hit-path"
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#d97706',
          strokeWidth: 2,
          strokeDasharray: '8 4',
          ...style,
        }}
      />

      {/* Overlay path that carries the animation id */}
      <path
        id={`${AVIAT_ANIMATION_ID}-${id}`}
        d={edgePath}
        fill="none"
        stroke="#d97706"
        strokeWidth={2}
        strokeDasharray="8 4"
        pointerEvents="none"
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
          {/* Always-visible "Aviat" badge */}
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded shadow">
            Aviat
          </span>

          {/* Hover-only "Microonda" tooltip */}
          {hovered && (
            <span className="bg-gray-700 text-white text-xs font-medium px-2 py-0.5 rounded shadow-lg">
              Microonda
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
