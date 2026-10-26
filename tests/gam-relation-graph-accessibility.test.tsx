import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { GraphEdge, GraphNode } from '../src/types/contracts';
import { GamRelationGraph } from '../src/components/graph/GamRelationGraph';

const nodes: GraphNode[] = [
  { id: 'p1', label: 'Data governance process', sort: 'Process', rawType: 'Process', origin: 'law', verified: true, sourceSpan: { start: 10, end: 35 } },
  { id: 'a1', label: 'Collect information', sort: 'Activity', rawType: 'Activity', origin: 'law', verified: false, sourceSpan: { start: 40, end: 60 } },
];

const edges: GraphEdge[] = [
  { id: 'e1', kind: 'relation', type: 'Contains', source: 'p1', target: 'a1', polarity: 'structural', origin: 'law', sourceSpan: { start: 20, end: 34 }, canonicalDirectionNote: 'Process → Activity' },
];

describe('GamRelationGraph keyboard access', () => {
  it('exposes focusable node and edge buttons with meaningful labels', () => {
    render(<GamRelationGraph nodes={nodes} edges={edges} selectedNodeId={null} selectedEdgeId={null}
      onSelectNode={vi.fn()} onSelectEdge={vi.fn()} onHighlightSpan={vi.fn()} reducedMotion />);

    const node = screen.getByTestId('graph-node-p1');
    const edge = screen.getByTestId('graph-edge-e1');
    expect(node).toHaveAttribute('tabindex', '0');
    expect(node).toHaveAttribute('aria-label', expect.stringContaining('Process Data governance process'));
    expect(edge).toHaveAttribute('tabindex', '0');
    expect(edge).toHaveAttribute('aria-label', expect.stringContaining('from Data governance process to Collect information'));
  });

  it('activates nodes and edges with Enter and Space and preserves source navigation', () => {
    const onSelectNode = vi.fn();
    const onSelectEdge = vi.fn();
    const onHighlightSpan = vi.fn();
    render(<GamRelationGraph nodes={nodes} edges={edges} selectedNodeId={null} selectedEdgeId={null}
      onSelectNode={onSelectNode} onSelectEdge={onSelectEdge} onHighlightSpan={onHighlightSpan} reducedMotion />);

    fireEvent.keyDown(screen.getByTestId('graph-node-p1'), { key: 'Enter' });
    expect(onSelectNode).toHaveBeenCalledWith(expect.objectContaining(nodes[0]));
    expect(onHighlightSpan).toHaveBeenLastCalledWith({ start: 10, end: 35 });

    fireEvent.keyDown(screen.getByTestId('graph-edge-e1'), { key: ' ' });
    expect(onSelectEdge).toHaveBeenCalledWith(edges[0]);
    expect(onHighlightSpan).toHaveBeenLastCalledWith({ start: 20, end: 34 });
  });
});
