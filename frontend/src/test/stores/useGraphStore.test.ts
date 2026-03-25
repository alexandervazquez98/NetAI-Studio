import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGraphStore } from '../../hooks/useGraphStore'

describe('useGraphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null })
  })

  it('addNode adds a node to the store', () => {
    const node = { id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: { label: 'SW-01' } }
    act(() => useGraphStore.getState().addNode(node))
    expect(useGraphStore.getState().nodes).toHaveLength(1)
    expect(useGraphStore.getState().nodes[0].id).toBe('n1')
  })

  it('deleteNode removes a node and its connected edges', () => {
    const node = { id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: { label: 'SW-01' } }
    const edge = { id: 'e1', source: 'n1', target: 'n2' }
    act(() => {
      useGraphStore.setState({ nodes: [node], edges: [edge] })
      useGraphStore.getState().deleteNode('n1')
    })
    expect(useGraphStore.getState().nodes).toHaveLength(0)
    expect(useGraphStore.getState().edges).toHaveLength(0)
  })

  it('updateNodeData patches node data', () => {
    const node = { id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: { label: 'SW-01', observable: true } }
    act(() => {
      useGraphStore.setState({ nodes: [node] })
      useGraphStore.getState().updateNodeData('n1', { label: 'SW-02', observable: false })
    })
    const updated = useGraphStore.getState().nodes[0]
    expect(updated.data.label).toBe('SW-02')
    expect(updated.data.observable).toBe(false)
  })

  it('selectNode sets selectedNodeId and clears selectedEdgeId', () => {
    act(() => {
      useGraphStore.setState({ selectedEdgeId: 'e1' })
      useGraphStore.getState().selectNode('n1')
    })
    expect(useGraphStore.getState().selectedNodeId).toBe('n1')
    expect(useGraphStore.getState().selectedEdgeId).toBeNull()
  })

  it('setGraph replaces nodes and edges', () => {
    const nodes = [{ id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: {} }]
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
    act(() => useGraphStore.getState().setGraph(nodes as any, edges as any))
    expect(useGraphStore.getState().nodes).toHaveLength(1)
    expect(useGraphStore.getState().edges).toHaveLength(1)
  })
})
