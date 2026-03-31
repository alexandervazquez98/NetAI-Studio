import React from 'react';
import { Handle, Position } from 'reactflow';

interface NodeHandlesProps {
  /** Whether the parent node is currently hovered — controls handle visibility */
  hovered?: boolean;
  /** Unused — kept for API compatibility */
  color?: string;
}

/**
 * 5 connection handles, one per cardinal side + one extra right port.
 *
 * Visibility is driven by the `hovered` prop from the parent node component,
 * which toggles via onMouseEnter/Leave on the node's root element.
 * This approach is more reliable than CSS :hover selectors because it
 * bypasses ReactFlow's inline style overrides on handle elements.
 *
 * When NOT hovered: handles are invisible (opacity 0, scaled down)
 * When hovered: handles appear with indigo color + smooth transition
 */
export const NodeHandles: React.FC<NodeHandlesProps> = ({ hovered = false }) => {
  const style: React.CSSProperties = hovered
    ? {
        width: 14,
        height: 14,
        background: '#6366f1',
        border: '2.5px solid white',
        borderRadius: '50%',
        boxShadow: '0 0 0 3px rgba(99,102,241,0.25)',
        opacity: 1,
        transform: 'scale(1)',
        transition: 'opacity 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease',
        cursor: 'crosshair',
      }
    : {
        width: 14,
        height: 14,
        background: 'transparent',
        border: 'none',
        borderRadius: '50%',
        boxShadow: 'none',
        opacity: 0,
        transform: 'scale(0.3)',
        transition: 'opacity 0.16s ease, transform 0.16s ease',
        cursor: 'default',
      };

  return (
    <>
      <Handle id="top"    type="source" position={Position.Top}    style={{ ...style, left: '50%' }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ ...style, left: '50%' }} />
      <Handle id="left"   type="source" position={Position.Left}   style={{ ...style, top: '50%' }} />
      <Handle id="right"  type="source" position={Position.Right}  style={{ ...style, top: '50%' }} />
      <Handle id="extra"  type="source" position={Position.Right}  style={{ ...style, top: '20%' }} />
    </>
  );
};
