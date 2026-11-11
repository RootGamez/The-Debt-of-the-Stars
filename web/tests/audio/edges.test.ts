import { describe, expect, it } from 'vitest';
import { createEdgeTracker } from '../../src/audio/edges';

describe('the edge tracker', () => {
  it('says nothing the first time it sees a state', () => {
    const edges = createEdgeTracker();

    expect(edges.update('light', true)).toBeUndefined();
  });

  it('reports a state turning on and turning off, once each', () => {
    const edges = createEdgeTracker();
    edges.update('light', false);

    expect(edges.update('light', true)).toBe('on');
    expect(edges.update('light', true)).toBeUndefined();
    expect(edges.update('light', false)).toBe('off');
    expect(edges.update('light', false)).toBeUndefined();
  });

  it('follows each name apart', () => {
    const edges = createEdgeTracker();
    edges.update('light', false);
    edges.update('reading', false);

    expect(edges.update('reading', true)).toBe('on');
    expect(edges.update('light', false)).toBeUndefined();
  });
});
