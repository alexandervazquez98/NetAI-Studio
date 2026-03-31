/**
 * Floating edge path utilities.
 *
 * Instead of using the fixed sourcePosition/targetPosition from the handle
 * that was dragged (which always exits from the same side), these helpers
 * compute the actual intersection of the source→target line with each node's
 * bounding box — so the edge exits from whichever border is closest to the
 * target node, making connections look natural regardless of node layout.
 *
 * This implements the "Floating Edges" pattern from ReactFlow docs.
 */

import { Position } from 'reactflow';
import type { Node } from 'reactflow';

/** Center point of a node in canvas coordinates. */
export function getNodeCenter(node: Node): { x: number; y: number } {
  const w = (node.width ?? 200) / 2;
  const h = (node.height ?? 100) / 2;
  return { x: node.position.x + w, y: node.position.y + h };
}

/**
 * Given a source and target center, determines which side of the source
 * node the edge should exit from, and which side of the target node it
 * should enter, based purely on the relative angle between the two.
 *
 * Returns { sx, sy, tx, ty, sourcePos, targetPos } representing the exact
 * pixel coordinates on the node borders where the edge should attach.
 */
export function getFloatingEdgeParams(
  sourceNode: Node,
  targetNode: Node,
): {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
} {
  const sc = getNodeCenter(sourceNode);
  const tc = getNodeCenter(targetNode);

  const sw = sourceNode.width ?? 200;
  const sh = sourceNode.height ?? 100;
  const tw = targetNode.width ?? 200;
  const th = targetNode.height ?? 100;

  // Direction vector: source → target
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;

  // Source exit point — find which border the line exits through
  const { x: sx, y: sy, pos: sourcePos } = getBorderIntersection(sc, dx, dy, sw, sh, sourceNode.position);
  // Target entry point — negate direction vector
  const { x: tx, y: ty, pos: targetPos } = getBorderIntersection(tc, -dx, -dy, tw, th, targetNode.position);

  return { sx, sy, tx, ty, sourcePos, targetPos };
}

/**
 * Finds where a ray from `center` in direction `(dx, dy)` exits the
 * node's bounding box. Returns the border pixel coords and the ReactFlow
 * Position constant for that side.
 */
function getBorderIntersection(
  center: { x: number; y: number },
  dx: number,
  dy: number,
  nodeW: number,
  nodeH: number,
  nodePos: { x: number; y: number },
): { x: number; y: number; pos: Position } {
  const hw = nodeW / 2;
  const hh = nodeH / 2;

  // Determine dominant axis
  if (Math.abs(dx) > Math.abs(dy)) {
    // Exit via left or right border
    if (dx > 0) {
      // Right border
      const t = hw / Math.abs(dx);
      return {
        x: nodePos.x + nodeW,
        y: center.y + dy * t,
        pos: Position.Right,
      };
    } else {
      // Left border
      const t = hw / Math.abs(dx);
      return {
        x: nodePos.x,
        y: center.y + dy * t,
        pos: Position.Left,
      };
    }
  } else {
    // Exit via top or bottom border
    if (dy > 0) {
      // Bottom border
      const t = hh / Math.abs(dy);
      return {
        x: center.x + dx * t,
        y: nodePos.y + nodeH,
        pos: Position.Bottom,
      };
    } else {
      // Top border
      const t = hh / Math.abs(dy);
      return {
        x: center.x + dx * t,
        y: nodePos.y,
        pos: Position.Top,
      };
    }
  }
}
