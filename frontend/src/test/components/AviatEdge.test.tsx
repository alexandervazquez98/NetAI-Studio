/**
 * TASK 3.1 RED — AviatEdge component tests
 *
 * Tests:
 * S1: renders animated overlay path with stroke #d97706 and strokeDasharray "8 4"
 * S2: hover → "Microonda" tooltip visible
 * S3: inline <style> tag with flowMove keyframes present (via shared helper)
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Position } from 'reactflow'

// ── Minimal mock for reactflow edge utilities ─────────────────────────────────
vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>()
  return {
    ...actual,
    getBezierPath: vi.fn(() => ['M 0 0 C 50 0 50 100 100 100', 50, 50]),
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="edge-label-renderer">{children}</div>
    ),
    BaseEdge: ({ id, path, style }: { id: string; path: string; style?: React.CSSProperties }) => (
      <svg>
        <path
          data-testid="base-edge-path"
          d={path}
          id={id}
          stroke={style?.stroke as string}
          strokeWidth={style?.strokeWidth as number}
          strokeDasharray={style?.strokeDasharray as string}
        />
      </svg>
    ),
  }
})

import { AviatEdge } from '../../components/GraphBuilder/edges/AviatEdge'

const DEFAULT_PROPS = {
  id: 'e-aviat-1',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 100,
  sourcePosition: Position.Bottom,
  targetPosition: Position.Top,
  selected: false,
  animated: false,
  interactionWidth: 20,
  data: {},
  markerEnd: undefined,
  markerStart: undefined,
  style: undefined,
  label: undefined,
  labelStyle: undefined,
  labelShowBg: false,
  labelBgStyle: undefined,
  labelBgPadding: [2, 4] as [number, number],
  labelBgBorderRadius: 2,
}

describe('AviatEdge', () => {
  it('S1: renders animated overlay path with stroke #d97706 and strokeDasharray "8 4"', () => {
    const { container } = render(<AviatEdge {...DEFAULT_PROPS} />)
    // The animated overlay <path> carries the actual dark amber color (#d97706),
    // the BaseEdge uses a lighter base (#fbbf24). Query by class name set by helper.
    const overlayPath = container.querySelector('.edge-anim-e-aviat-1') as SVGPathElement | null
    expect(overlayPath).not.toBeNull()
    expect(overlayPath!.getAttribute('stroke')).toBe('#d97706')
    expect(
      overlayPath!.getAttribute('strokeDasharray') ?? overlayPath!.getAttribute('stroke-dasharray')
    ).toBe('8 4')
  })

  it('S1: always-visible "Aviat" badge is rendered', () => {
    render(<AviatEdge {...DEFAULT_PROPS} />)
    expect(screen.getByText('Aviat')).toBeDefined()
  })

  it('S2: hover shows "Microonda" tooltip', () => {
    render(<AviatEdge {...DEFAULT_PROPS} />)
    // Microonda should NOT be visible before hover
    expect(screen.queryByText('Microonda')).toBeNull()
    // Trigger hover on the invisible hit-area path
    const hitPath = document.querySelector('[data-testid="aviat-hit-path"]')
    expect(hitPath).not.toBeNull()
    fireEvent.mouseEnter(hitPath!)
    expect(screen.getByText('Microonda')).toBeDefined()
    fireEvent.mouseLeave(hitPath!)
    expect(screen.queryByText('Microonda')).toBeNull()
  })

  it('S3: inline <style> tag with flowMove keyframes is present (via shared helper)', () => {
    const { container } = render(<AviatEdge {...DEFAULT_PROPS} />)
    const styleEl = container.querySelector('style')
    expect(styleEl).not.toBeNull()
    // The shared buildEdgeAnimation helper generates 'flowMove-{id}' keyframes
    expect(styleEl!.textContent).toContain('flowMove')
  })
})
