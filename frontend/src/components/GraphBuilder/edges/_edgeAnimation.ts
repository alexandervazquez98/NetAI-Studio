/**
 * Shared CSS keyframe injection for animated edges.
 * Each edge type uses its own color and dasharray, but the animation timing is consistent.
 */

export interface EdgeAnimationConfig {
  /** Unique prefix to namespace the @keyframes rule (no spaces, use edge id) */
  animId: string;
  /** Stroke color */
  color: string;
  /** Stroke width in px */
  width: number;
  /** stroke-dasharray value e.g. "8 4" */
  dash: string;
  /** Animation duration (default: "1.2s") */
  duration?: string;
}

/**
 * Returns the `<style>` string AND the animated `<path>` props for use in a custom ReactFlow edge.
 */
export function buildEdgeAnimation(cfg: EdgeAnimationConfig) {
  const dur = cfg.duration ?? '1.2s';
  const dashTotal = cfg.dash
    .split(' ')
    .map(Number)
    .reduce((a, b) => a + b, 0);

  const css = `
    @keyframes flowMove-${cfg.animId} {
      from { stroke-dashoffset: ${dashTotal}; }
      to   { stroke-dashoffset: 0; }
    }
    .edge-anim-${cfg.animId} {
      animation: flowMove-${cfg.animId} ${dur} linear infinite;
    }
  `;

  return { css };
}
