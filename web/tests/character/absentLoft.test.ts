// Las superficies suaves de los Ausentes vivos (plan de finales, E3): la rejilla teje los triángulos que debe, con
// las caras y las normales hacia fuera, sin costura en un tubo cerrado; los puntos caen sobre la superficie.
import { describe, expect, it } from 'vitest';
import { Color, Vector3 } from 'three';
import {
  gridGeometry,
  loftGeometry,
  onSections,
  plateEdge,
  ringPoint,
  rowsBetween,
  sectionAt,
  spread,
} from '../../src/character/absentLoft';
import type { Section } from '../../src/character/absentShape';

const WHITE = new Color('#ffffff');
const tube: Section[] = [
  { z: 0, rx: 0.2, front: 0.2, back: 0.2 },
  { z: 1, rx: 0.2, front: 0.2, back: 0.2 },
];

describe('weaving a grid', () => {
  it('makes two triangles per cell, and wraps around a closed tube', () => {
    const open = loftGeometry(tube, {
      rows: [0, 0.5, 1],
      columns: 12,
      arc: [0, Math.PI],
      color: () => WHITE,
    });
    expect(open.getAttribute('position').count / 3).toBe(12 * 2 * 2);
    const closed = loftGeometry(tube, { rows: [0, 0.5, 1], columns: 12, color: () => WHITE });
    expect(closed.getAttribute('position').count / 3).toBe(12 * 2 * 2);
    expect(closed.getAttribute('color')).toBeDefined();
    expect(closed.getAttribute('normal')).toBeDefined();
  });

  it('turns the faces and the normals outwards, also across the seam of a closed tube', () => {
    const g = loftGeometry(tube, { rows: [0, 0.5, 1], columns: 16, color: () => WHITE });
    const position = g.getAttribute('position');
    const normal = g.getAttribute('normal');
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    for (let k = 0; k < position.count; k += 3) {
      a.fromBufferAttribute(position, k);
      b.fromBufferAttribute(position, k + 1);
      c.fromBufferAttribute(position, k + 2);
      const face = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
      const out = a.clone().add(b).add(c).setZ(0);
      expect(face.dot(out)).toBeGreaterThan(0);
    }
    for (let k = 0; k < normal.count; k++) {
      const n = new Vector3().fromBufferAttribute(normal, k);
      const p = new Vector3().fromBufferAttribute(position, k).setZ(0).normalize();
      // Suave: la normal de un vértice es la del cilindro, no la de una cara.
      expect(n.dot(p)).toBeGreaterThan(0.99);
    }
  });

  it('flips the outer side when asked', () => {
    const g = gridGeometry({
      us: spread(0, Math.PI, 5),
      vs: [1, 0],
      flip: true,
      point: (u, v) => new Vector3(Math.sin(u), Math.cos(u), v),
      color: () => WHITE,
    });
    const n = new Vector3().fromBufferAttribute(g.getAttribute('normal'), 0);
    const p = new Vector3().fromBufferAttribute(g.getAttribute('position'), 0).setZ(0);
    expect(n.dot(p)).toBeGreaterThan(0);
  });
});

describe('points on the sections', () => {
  const egg: Section[] = [
    { z: 0, rx: 0.1, front: 0.15, back: 0.12, y: 0.01 },
    { z: 0.3, rx: 0.2, front: 0.25, back: 0.18, y: -0.02 },
    { z: 0.6, rx: 0.05, front: 0.05, back: 0.08, y: -0.05 },
  ];

  it('reaches front, back and sides with their own depths', () => {
    const mid = sectionAt(egg, 0.3);
    expect(ringPoint(mid, 0).y).toBeCloseTo(-0.02 + 0.25, 6);
    expect(ringPoint(mid, Math.PI).y).toBeCloseTo(-0.02 - 0.18, 6);
    expect(ringPoint(mid, Math.PI / 2).x).toBeCloseTo(0.2, 6);
    expect(ringPoint(mid, Math.PI / 2, 0.01).x).toBeCloseTo(0.21, 6);
  });

  it('gives an outward normal', () => {
    for (const az of [0, 0.7, 1.6, 3, 4.4, 5.9]) {
      const { point, normal } = onSections(egg, az, 0.25);
      const out = point.clone().sub(new Vector3(0, -0.02, point.z));
      expect(normal.dot(out)).toBeGreaterThan(0);
      expect(normal.length()).toBeCloseTo(1, 6);
    }
  });
});

describe('plates and rows', () => {
  it('rounds the lip of a plate inwards and tucks its top under the next one', () => {
    expect(plateEdge(0, 1, 0, { lip: 0.02, inset: 0.006 })).toBeCloseTo(-0.006, 4);
    expect(plateEdge(0, 1, 0.5)).toBe(0);
    expect(plateEdge(0, 1, 1.02, { tuck: 0.03, inset: 0.006 })).toBeCloseTo(-0.006, 4);
  });

  it('spaces rows by at most a step and keeps the extra ones, sorted and without repeats', () => {
    const rows = rowsBetween(0, 1, 0.3, [0.5, 0.5, 2]);
    expect(rows[0]).toBe(0);
    expect(rows.at(-1)).toBe(1);
    expect(rows).toContain(0.5);
    expect(rows).not.toContain(2);
    for (let k = 1; k < rows.length; k++) {
      expect((rows[k] ?? 0) - (rows[k - 1] ?? 0)).toBeGreaterThan(0);
      expect((rows[k] ?? 0) - (rows[k - 1] ?? 0)).toBeLessThanOrEqual(0.3 + 1e-9);
    }
  });
});
