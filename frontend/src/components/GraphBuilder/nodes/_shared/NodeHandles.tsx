import React from 'react';
import { Handle, Position } from 'reactflow';

interface NodeHandlesProps {
  /** Unused — kept for API compatibility */
  color?: string;
}

/**
 * 5 connection handles, one per cardinal side + one extra right port.
 *
 * All visual styling (hidden at rest, animated reveal on node hover,
 * glow on handle hover) is handled entirely by CSS in index.css.
 * This keeps the component clean and avoids Tailwind/ReactFlow specificity fights.
 */
export const NodeHandles: React.FC<NodeHandlesProps> = () => (
  <>
    <Handle id="top"    type="source" position={Position.Top}    className="netai-handle" style={{ left: '50%' }} />
    <Handle id="bottom" type="source" position={Position.Bottom} className="netai-handle" style={{ left: '50%' }} />
    <Handle id="left"   type="source" position={Position.Left}   className="netai-handle" style={{ top: '50%' }} />
    <Handle id="right"  type="source" position={Position.Right}  className="netai-handle" style={{ top: '50%' }} />
    <Handle id="extra"  type="source" position={Position.Right}  className="netai-handle" style={{ top: '20%' }} />
  </>
);

