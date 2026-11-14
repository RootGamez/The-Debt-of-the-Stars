// La silueta de los dos Ausentes vivos (plan de finales, E3; 🟡 Anthony 2026-11-14): él más alto que ella, ella
// esbelta (hombros estrechos, cintura marcada, cuello largo) y él ancho de hombros y de cuello corto; sus aros de oro,
// los de ella muchos y finos y los de él pocos y gruesos; y los aros de la cabeza flotan sin tocar el vidrio.
import { describe, expect, it } from 'vitest';
import {
  ABSENT_SKELETONS,
  ABSENT_WHO,
  lapRadius,
  neckLength,
  shoulderSpan,
  thighRadius,
} from '../../src/character/absentSkeleton';
import {
  ABSENT_RINGS,
  ABSENT_SHAPES,
  crownHeight,
  headHeightAt,
  limbSections,
  type RingPlace,
} from '../../src/character/absentShape';
import { sectionAt } from '../../src/character/absentLoft';

const narrowest = (who: 'cientifica' | 'esceptico', from: number, to: number): number => {
  let least = Infinity;
  for (let z = from; z <= to; z += 0.005)
    least = Math.min(least, sectionAt(ABSENT_SHAPES[who].torso, z).rx);
  return least;
};

const widest = (who: 'cientifica' | 'esceptico', from: number, to: number): number => {
  let most = 0;
  for (let z = from; z <= to; z += 0.005)
    most = Math.max(most, sectionAt(ABSENT_SHAPES[who].torso, z).rx);
  return most;
};

describe('the skeletons of the two living Absent', () => {
  it('makes him taller than her, both well above 2.5 m (her about 2.6 m, him about 3 m)', () => {
    expect(crownHeight('cientifica')).toBeGreaterThan(2.55);
    expect(crownHeight('cientifica')).toBeLessThan(2.68);
    expect(crownHeight('esceptico')).toBeGreaterThan(2.98);
    expect(crownHeight('esceptico')).toBeLessThan(3.12);
    expect(crownHeight('esceptico') - crownHeight('cientifica')).toBeGreaterThan(0.3);
  });

  it('gives her narrow shoulders and a long thin neck, and him broad shoulders and a short thick neck', () => {
    expect(shoulderSpan('esceptico')).toBeGreaterThan(shoulderSpan('cientifica') * 1.6);
    expect(neckLength('cientifica')).toBeGreaterThan(neckLength('esceptico') + 0.07);
    const neckWidth = (who: 'cientifica' | 'esceptico'): number =>
      sectionAt(ABSENT_SHAPES[who].neck, ABSENT_SKELETONS[who].joints.neck[2] + 0.1).rx;
    expect(neckWidth('esceptico')).toBeGreaterThan(neckWidth('cientifica') * 1.6);
  });

  it('keeps the joints in order from the feet to the head, with the head pivot inside the head', () => {
    for (const who of ABSENT_WHO) {
      const j = ABSENT_SKELETONS[who].joints;
      const order = [j.ankle, j.knee, j.hip, j.pelvis, j.spine, j.chest, j.neck, j.head];
      for (let k = 1; k < order.length; k++)
        expect(order[k]?.[2]).toBeGreaterThan(order[k - 1]?.[2] ?? 0);
      expect(j.wrist[2]).toBeLessThan(j.elbow[2]);
      expect(j.elbow[2]).toBeLessThan(j.shoulder[2]);
      expect(headHeightAt(who, 0)).toBeLessThan(j.head[2]);
      expect(thighRadius(who)).toBeGreaterThan(0.12);
      expect(lapRadius(who)).toBeGreaterThan(thighRadius(who) - 0.01);
    }
  });

  it('marks her waist and keeps it much narrower than her shoulders; his waist is thick', () => {
    const her = ABSENT_SKELETONS.cientifica.joints;
    const herWaist = narrowest('cientifica', her.spine[2], her.chest[2]);
    const herChest = widest('cientifica', her.chest[2], her.shoulder[2]);
    expect(herWaist / herChest).toBeLessThan(0.7);
    const him = ABSENT_SKELETONS.esceptico.joints;
    const hisWaist = narrowest('esceptico', him.spine[2] - 0.05, him.chest[2]);
    const hisChest = widest('esceptico', him.chest[2], him.shoulder[2]);
    expect(hisWaist).toBeGreaterThan(herWaist * 1.6);
    expect(hisChest).toBeGreaterThan(herChest * 1.7);
  });

  it('gives him thicker arms and hands than her', () => {
    const thickest = (who: 'cientifica' | 'esceptico'): number =>
      Math.max(...ABSENT_SHAPES[who].forearm.map(([, rx]) => rx));
    expect(thickest('esceptico')).toBeGreaterThan(thickest('cientifica') * 1.8);
    expect(ABSENT_SKELETONS.esceptico.handLength).toBeGreaterThan(
      ABSENT_SKELETONS.cientifica.handLength,
    );
  });

  it('lays the limb sections along their bones, from the lower joint up', () => {
    const arm = limbSections('esceptico', 'shoulder', 'elbow', ABSENT_SHAPES.esceptico.upperArm);
    const { shoulder, elbow } = ABSENT_SKELETONS.esceptico.joints;
    for (let k = 1; k < arm.length; k++) expect(arm[k]?.z).toBeGreaterThan(arm[k - 1]?.z ?? 0);
    const mid = arm.find((p) => Math.abs(p.z - (shoulder[2] + elbow[2]) / 2) < 0.2);
    expect(mid?.x).toBeGreaterThan(shoulder[0] - 0.01);
    expect(mid?.x).toBeLessThan(elbow[0] + 0.01);
  });
});

describe('their golden rings', () => {
  const places: readonly RingPlace[] = ['neck', 'wrist', 'ankle', 'head'];
  const at = (who: 'cientifica' | 'esceptico', place: RingPlace) =>
    ABSENT_RINGS[who].find((r) => r.place === place);

  it('wears them at the neck, the wrists, the ankles and around the head', () => {
    for (const who of ABSENT_WHO) for (const place of places) expect(at(who, place)).toBeDefined();
  });

  it('gives her more and thinner rings than him, everywhere', () => {
    for (const place of places) {
      const hers = at('cientifica', place);
      const his = at('esceptico', place);
      expect(hers?.count).toBeGreaterThan(his?.count ?? 0);
      expect(hers?.tube ?? 1).toBeLessThan((his?.tube ?? 0) * 0.6);
    }
  });
});

describe('interpolating the sections', () => {
  it('passes through every section and never bulges past its neighbours', () => {
    const torso = ABSENT_SHAPES.esceptico.torso;
    for (const p of torso) expect(sectionAt(torso, p.z).rx).toBeCloseTo(p.rx, 6);
    for (let k = 1; k < torso.length; k++) {
      const a = torso[k - 1];
      const b = torso[k];
      if (!a || !b) continue;
      const mid = sectionAt(torso, (a.z + b.z) / 2).rx;
      expect(mid).toBeLessThanOrEqual(Math.max(a.rx, b.rx) + 1e-9);
      expect(mid).toBeGreaterThanOrEqual(Math.min(a.rx, b.rx) - 1e-9);
    }
  });

  it('holds the end sections beyond the ends', () => {
    const neck = ABSENT_SHAPES.cientifica.neck;
    expect(sectionAt(neck, 0).rx).toBe(neck[0]?.rx);
    expect(sectionAt(neck, 9).rx).toBe(neck[neck.length - 1]?.rx);
  });
});
