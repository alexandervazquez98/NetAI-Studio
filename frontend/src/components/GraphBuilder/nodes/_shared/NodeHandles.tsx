import React from 'react';
import { Handle, Position } from 'reactflow';

interface NodeHandlesProps {
  /** Tailwind color class injected into handle bg — e.g. "!bg-blue-500" */
  color: string;
}

/**
 * 5 bidirectional connection handles, homologated across ALL device node types.
 *
 * Layout:
 *   - top    → center-top      (25% from left so it doesn't overlap the node center)
 *   - bottom → center-bottom
 *   - left   → center-left
 *   - right  → center-right
 *   - extra  → top-right corner  (2nd slot on the right side at 25% from top)
 *
 * Each position has TWO handles stacked: source + target.
 * With ConnectionMode.Loose, ReactFlow allows connecting any handle to any handle
 * regardless of type, giving full bidirectionality without restricting topology.
 */
export const NodeHandles: React.FC<NodeHandlesProps> = ({ color }) => {
  const cls = `!w-2.5 !h-2.5 !border-2 !border-white ${color} transition-opacity`;

  return (
    <>
      {/* ── Top ──────────────────────────────────────────────────────────── */}
      <Handle id="top-target" type="target" position={Position.Top}
        className={cls} style={{ left: '50%' }} />
      <Handle id="top-source" type="source" position={Position.Top}
        className={cls} style={{ left: '50%', opacity: 0, pointerEvents: 'none' }} />

      {/* ── Bottom ───────────────────────────────────────────────────────── */}
      <Handle id="bottom-target" type="target" position={Position.Bottom}
        className={cls} style={{ left: '50%' }} />
      <Handle id="bottom-source" type="source" position={Position.Bottom}
        className={cls} style={{ left: '50%', opacity: 0, pointerEvents: 'none' }} />

      {/* ── Left ─────────────────────────────────────────────────────────── */}
      <Handle id="left-target" type="target" position={Position.Left}
        className={cls} style={{ top: '50%' }} />
      <Handle id="left-source" type="source" position={Position.Left}
        className={cls} style={{ top: '50%', opacity: 0, pointerEvents: 'none' }} />

      {/* ── Right ────────────────────────────────────────────────────────── */}
      <Handle id="right-target" type="target" position={Position.Right}
        className={cls} style={{ top: '50%' }} />
      <Handle id="right-source" type="source" position={Position.Right}
        className={cls} style={{ top: '50%', opacity: 0, pointerEvents: 'none' }} />

      {/* ── Extra (top-right) ─────────────────────────────────────────────── */}
      <Handle id="extra-target" type="target" position={Position.Right}
        className={cls} style={{ top: '20%' }} />
      <Handle id="extra-source" type="source" position={Position.Right}
        className={cls} style={{ top: '20%', opacity: 0, pointerEvents: 'none' }} />
    </>
  );
};
