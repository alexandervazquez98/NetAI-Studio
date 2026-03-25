import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock reactflow to avoid ResizeObserver / DOM measurement errors in jsdom
vi.mock('reactflow', async () => {
  const actual = await vi.importActual<typeof import('reactflow')>('reactflow')
  return {
    ...actual,
    Handle: () => null,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

import { CoreInternalNode } from '../../components/GraphBuilder/nodes/CoreInternalNode'
import { CoreExternalNode } from '../../components/GraphBuilder/nodes/CoreExternalNode'
import { AviatCTRNode } from '../../components/GraphBuilder/nodes/AviatCTRNode'
import { SdwanCPENode } from '../../components/GraphBuilder/nodes/SdwanCPENode'
import { AccessSwitchNode } from '../../components/GraphBuilder/nodes/AccessSwitchNode'

const baseProps = {
  id: 'test-node',
  selected: false,
  zIndex: 1,
  isConnectable: true,
  xPos: 0,
  yPos: 0,
  dragging: false,
  type: 'test',
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
}

describe('Custom ReactFlow Nodes', () => {
  it('CoreInternalNode renders label and INT badge', () => {
    render(<CoreInternalNode {...baseProps} data={{ label: 'SW-HQ-INT-01', observable: true }} />)
    expect(screen.getByText('SW-HQ-INT-01')).toBeInTheDocument()
    expect(screen.getByText('INT')).toBeInTheDocument()
  })

  it('CoreExternalNode renders EXT badge', () => {
    render(<CoreExternalNode {...baseProps} data={{ label: 'SW-HQ-EXT-01' }} />)
    expect(screen.getByText('EXT')).toBeInTheDocument()
  })

  it('AviatCTRNode renders CTR badge', () => {
    render(<AviatCTRNode {...baseProps} data={{ label: 'CTR-HQ-01' }} />)
    expect(screen.getByText('CTR')).toBeInTheDocument()
  })

  it('SdwanCPENode renders Caja Negra badge', () => {
    render(<SdwanCPENode {...baseProps} data={{ label: 'SDWAN-CPE-F', observable: false }} />)
    expect(screen.getByText(/Caja Negra/i)).toBeInTheDocument()
  })

  it('AccessSwitchNode renders ACCESS badge', () => {
    render(<AccessSwitchNode {...baseProps} data={{ label: 'ACC-01' }} />)
    expect(screen.getByText('ACCESS')).toBeInTheDocument()
  })
})
