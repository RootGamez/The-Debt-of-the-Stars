import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';
import { SKETCH_IDS, sketchOf } from '../../src/ui/notebookSketches';

describe('the sketches of the notebook', () => {
  it('has every sketch named by the clue data', () => {
    const named = [...loadClues().facts.values()].flatMap((f) => (f.sketch ? [f.sketch] : []));

    expect(named.length).toBeGreaterThan(0);
    for (const id of named) expect(SKETCH_IDS, id).toContain(id);
  });

  it('gives every sketch an alternative text and some strokes', () => {
    for (const id of SKETCH_IDS) {
      const sketch = sketchOf(id);
      expect(sketch?.alt.length, id).toBeGreaterThan(10);
      expect(sketch?.shapes.length, id).toBeGreaterThan(2);
    }
  });

  it('draws the same strokes every time (the hand shakes the same way)', () => {
    for (const id of SKETCH_IDS) expect(sketchOf(id), id).toEqual(sketchOf(id));
  });

  it('knows nothing of an unknown sketch', () => {
    expect(sketchOf('no_existe')).toBeUndefined();
  });

  it('keeps every stroke inside the page of the sketch', () => {
    for (const id of SKETCH_IDS) {
      for (const shape of sketchOf(id)?.shapes ?? []) {
        const numbers =
          (shape.type === 'path' ? shape.d.match(/-?\d+(\.\d+)?/g) : [])?.map(Number) ?? [];
        for (const n of numbers) expect(Math.abs(n), id).toBeLessThanOrEqual(260);
      }
    }
  });
});
