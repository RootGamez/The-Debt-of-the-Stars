// Los retratos de los dos Ausentes vivos para las charlas (plan de finales, E3): un óvalo oscuro sin rostro con
// dibujos de luz que son solo rombos y triángulos (nunca espirales ni hexágonos), y el signo de cada uno en el pecho.
import { describe, expect, it } from 'vitest';
import { ABSENT_PORTRAITS } from '../../src/ui/absentPortraits';
import { portraitOf } from '../../src/typewriter/speech';

const corners = (points: string | number | undefined): number =>
  String(points ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

describe('the portraits of the two living Absent', () => {
  for (const who of ['cientifica', 'esceptico'] as const) {
    const shapes = ABSENT_PORTRAITS[who];
    const of = (className: string) => shapes.filter(([, c]) => c.split(' ').includes(className));

    it(`draws ${who} with a dark glass head and no face`, () => {
      expect(of('head')).toHaveLength(1);
      expect(of('head')[0]?.[0]).toBe('ellipse');
      expect(of('eye')).toHaveLength(0);
      expect(of('mouth')).toHaveLength(0);
    });

    it(`lights ${who}'s head only with diamonds and triangles`, () => {
      const patterns = of('pattern');
      expect(patterns.length).toBeGreaterThanOrEqual(3);
      for (const [tag, , attributes] of patterns) {
        expect(tag).toBe('polygon');
        expect([3, 4]).toContain(corners(attributes.points));
      }
    });

    it(`keeps ${who}'s lights in one column down the middle (a pair side by side would read as eyes)`, () => {
      const head = of('head')[0]?.[2];
      for (const [, , attributes] of of('pattern')) {
        const xs = String(attributes.points)
          .trim()
          .split(/\s+/)
          .map((pair) => Number(pair.split(',')[0]));
        const middle = xs.reduce((a, b) => a + b, 0) / xs.length;
        expect(Math.abs(middle - Number(head?.cx))).toBeLessThan(0.6);
      }
    });

    it(`puts ${who}'s sign on the chest, below the head`, () => {
      const sign = of('sign');
      expect(sign.length).toBeGreaterThan(0);
      for (const [, , attributes] of sign) {
        const ys = String(attributes.points ?? attributes.d ?? `0,${String(attributes.cy)}`)
          .match(/-?\d+(\.\d+)?/g)
          ?.map(Number)
          .filter((_, k) => k % 2 === 1);
        expect(Math.min(...(ys ?? [0]))).toBeGreaterThan(70);
      }
    });
  }

  it('tells them apart by the sign: a diamond with a dot, and two triangles tip to tip', () => {
    const signOf = (who: 'cientifica' | 'esceptico') =>
      ABSENT_PORTRAITS[who].filter(([, c]) => c.split(' ').includes('sign'));
    const hers = signOf('cientifica');
    expect(hers.filter(([tag]) => tag === 'circle')).toHaveLength(1);
    expect(hers.filter(([tag, , a]) => tag === 'polygon' && corners(a.points) === 4)).toHaveLength(
      1,
    );
    const his = signOf('esceptico');
    expect(his.filter(([tag, , a]) => tag === 'polygon' && corners(a.points) === 3)).toHaveLength(
      2,
    );
    expect(his.filter(([tag]) => tag === 'circle')).toHaveLength(0);
  });

  const classed = (who: 'cientifica' | 'esceptico', className: string) =>
    ABSENT_PORTRAITS[who].filter(([, c]) => c.split(' ').includes(className));

  it('gives her more and thinner gold rings than him (🟡)', () => {
    const hers = classed('cientifica', 'gold');
    const his = classed('esceptico', 'gold');
    expect(hers.length).toBeGreaterThan(his.length);
    expect(his.length).toBeGreaterThanOrEqual(2);
    for (const [, c] of hers) expect(c.split(' ')).toContain('thin');
    for (const [, c] of his) expect(c.split(' ')).toContain('thick');
  });

  it('draws the head rings behind the glass, so they never cover its lights', () => {
    for (const who of ['cientifica', 'esceptico'] as const) {
      const shapes = ABSENT_PORTRAITS[who];
      const head = shapes.findIndex(([, c]) => c.split(' ').includes('head'));
      const rings = shapes.flatMap(([, c], k) => (c.split(' ').includes('head-ring') ? [k] : []));
      expect(rings.length).toBeGreaterThan(0);
      for (const k of rings) expect(k).toBeLessThan(head);
    }
  });

  it('tells them apart by the silhouette: her narrow shoulders and long neck, his broad ones', () => {
    const shoulders = (who: 'cientifica' | 'esceptico'): number => {
      const xs = classed(who, 'skin')
        .flatMap(([, , a]) => String(a.d).match(/-?\d+(\.\d+)?/g) ?? [])
        .map(Number)
        .filter((_, k) => k % 2 === 0);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(shoulders('esceptico')).toBeGreaterThan(shoulders('cientifica') * 1.3);
    const neckLength = (who: 'cientifica' | 'esceptico'): number => {
      const ys = classed(who, 'neck')
        .flatMap(([, , a]) => String(a.d).match(/-?\d+(\.\d+)?/g) ?? [])
        .map(Number)
        .filter((_, k) => k % 2 === 1);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(neckLength('cientifica')).toBeGreaterThan(neckLength('esceptico') * 1.3);
  });

  it('dresses her in a mantle and him in a vest with the bandolier (🟡)', () => {
    expect(classed('cientifica', 'mantle').length).toBeGreaterThan(0);
    expect(classed('esceptico', 'vest').length).toBeGreaterThan(0);
    expect(classed('esceptico', 'strap').length).toBeGreaterThan(0);
  });

  it('is chosen for the talks whose source ends in .cientifica or .esceptico', () => {
    expect(portraitOf('lab.cientifica')).toBe('cientifica');
    expect(portraitOf('taller.esceptico')).toBe('esceptico');
    expect(portraitOf('instituto.maestra')).toBe('maestra');
  });
});
