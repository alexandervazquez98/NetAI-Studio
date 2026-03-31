import React from 'react';
import { Handle, Position } from 'reactflow';

interface NodeHandlesProps {
  /** Unused — kept for API compatibility while handles are invisible */
  color?: string;
}

/**
 * 5 invisible connection handles, one per cardinal side + one extra right port.
 *
 * Handles are fully transparent — no circles, no borders — so the node
 * renders without any visual connection indicators. The user connects nodes
 * by hovering near the node border (cursor becomes a crosshair) and dragging.
 *
 * ConnectionMode.Loose on the canvas allows source→source connections in
 * any direction, so all handles use type="source" for bidirectionality.
 */
export const NodeHandles: React.FC<NodeHandlesProps> = () => {
  // Invisible: transparent bg, no border, no shadow, no scale on hover.
  // The handle area is still interactable — ReactFlow detects hover and
  // changes cursor to crosshair so the user knows they can drag a connection.
  const cls = '!w-3 !h-3 !bg-transparent !border-0 !shadow-none !rounded-full';

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
