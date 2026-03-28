import React from 'react';
import { Handle, Position } from 'reactflow';

interface NodeHandlesProps {
  /** Tailwind color class for handle background — e.g. "!bg-blue-500" */
  color: string;
}

/**
 * 5 connection handles, homologated across ALL device node types.
 *
 * Uses type="source" exclusively.
 * With ConnectionMode.Loose active on the canvas, ReactFlow allows
 * source→source connections in any direction — fully bidirectional.
 *
 * Each handle has a stable `id` so serialized edges keep their
 * sourceHandle/targetHandle references when persisted to the backend.
 *
 * Layout:
 *   top    → center-top
 *   bottom → center-bottom
 *   left   → center-left
 *   right  → center-right (at 50% from top)
 *   extra  → right side, at 25% from top (2nd right-side port)
 */
export const NodeHandles: React.FC<NodeHandlesProps> = ({ color }) => {
  const cls = `!w-3 !h-3 !rounded-full !border-2 !border-white ${color} hover:!scale-125 transition-transform`;

  return (
    <>
      <Handle id="top"    type="source" position={Position.Top}    className={cls} style={{ left: '50%' }} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={cls} style={{ left: '50%' }} />
      <Handle id="left"   type="source" position={Position.Left}   className={cls} style={{ top: '50%' }} />
      <Handle id="right"  type="source" position={Position.Right}  className={cls} style={{ top: '50%' }} />
      <Handle id="extra"  type="source" position={Position.Right}  className={cls} style={{ top: '20%' }} />
    </>
  );
};
