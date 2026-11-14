// Las poses de los dos Ausentes vivos (plan de finales, E3): ángulos dentro de lo que puede doblar un cuerpo, sin
// saltos ni con el tiempo ni al pasar de una pose a otra, sentados con las caderas sobre el asiento y los pies en el
// suelo, y la postura de cada uno (ella erguida, él encorvado y con los hombros caídos).
import { describe, expect, it } from 'vitest';
import {
  ABSENT_POSE_NAMES,
  ABSENT_WHO,
  absentPose,
  armChain,
  DEFAULT_SEAT,
  legChain,
  type AbsentPose,
} from '../../src/character/absentPoses';
import {
  advanceAbsentPoser,
  createAbsentPoser,
  currentAbsentPose,
  mixAbsentPose,
  switchAbsentPose,
} from '../../src/character/absentPoser';
import { ABSENT_JOINTS, thighRadius } from '../../src/character/absentSkeleton';

const LIMITS = {
  hip: [-0.6, 2.2],
  hipRoll: [-0.3, 0.4],
  knee: [0, 2.4],
  ankle: [-1, 1],
  shoulder: [-0.9, 2.2],
  shoulderRoll: [-0.6, 1],
  elbow: [0, 2.5],
  wrist: [-1.3, 1.3],
  spinePitch: [-0.7, 0.3],
  chestPitch: [-0.7, 0.3],
  neckPitch: [-0.6, 0.4],
  headPitch: [-0.7, 0.5],
  headYaw: [-0.7, 0.7],
  bob: [-1, 0.05],
  shrug: [-0.12, 0.06],
  breath: [-0.03, 0.03],
  sign: [0, 1],
  patterns: [0, 1],
  frost: [0, 1],
} as const;

/** Todos los números de una pose, con su nombre, para comparar dos poses o mirar sus rangos. */
function numbers(pose: AbsentPose): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(pose)) {
    if (typeof value === 'number') out[key] = value;
  }
  pose.legs.forEach((leg, k) => {
    for (const [key, value] of Object.entries(leg)) out[`legs.${k}.${key}`] = value as number;
  });
  pose.arms.forEach((arm, k) => {
    for (const [key, value] of Object.entries(arm)) out[`arms.${k}.${key}`] = value as number;
  });
  return out;
}

function limitOf(key: string): readonly [number, number] | undefined {
  const last = key.split('.').pop() ?? key;
  return (LIMITS as Record<string, readonly [number, number]>)[last];
}

function largestJump(a: AbsentPose, b: AbsentPose): number {
  const x = numbers(a);
  const y = numbers(b);
  return Math.max(...Object.keys(x).map((key) => Math.abs((x[key] ?? 0) - (y[key] ?? 0))));
}

const TIMES = Array.from({ length: 121 }, (_, k) => k * 0.73);

describe('the poses of the two living Absent', () => {
  it('keeps every joint within what a body can bend, in every pose, for both, at any time', () => {
    for (const who of ABSENT_WHO) {
      for (const name of ABSENT_POSE_NAMES) {
        for (const time of TIMES) {
          for (const [key, value] of Object.entries(numbers(absentPose(who, name, time)))) {
            expect(Number.isFinite(value), `${who} ${name} ${key}`).toBe(true);
            const limit = limitOf(key);
            if (!limit) continue;
            expect(value, `${who} ${name} ${key} at ${time}`).toBeGreaterThanOrEqual(limit[0]);
            expect(value, `${who} ${name} ${key} at ${time}`).toBeLessThanOrEqual(limit[1]);
          }
        }
      }
    }
  });

  it('moves smoothly with time: no jumps from one frame to the next', () => {
    for (const who of ABSENT_WHO) {
      for (const name of ABSENT_POSE_NAMES) {
        let previous = absentPose(who, name, 0);
        for (let k = 1; k <= 60 * 40; k++) {
          const next = absentPose(who, name, k / 60);
          expect(largestJump(previous, next)).toBeLessThan(0.01);
          previous = next;
        }
      }
    }
  });

  it('stands still when frozen: rigid, no breath, all frost, and only the sign keeps a faint light', () => {
    const a = absentPose('cientifica', 'frozen', 0);
    const b = absentPose('cientifica', 'frozen', 37);
    expect(a.frost).toBe(1);
    expect(a.breath).toBe(0);
    expect(b.breath).toBe(0);
    expect(numbers(a)['arms.0.shoulder']).toBe(numbers(b)['arms.0.shoulder']);
    expect(a.headPitch).toBe(b.headPitch);
    expect(a.sign).toBeGreaterThan(0);
    expect(a.sign).toBeLessThan(0.3);
    expect(absentPose('cientifica', 'standing', 0).frost).toBe(0);
  });

  it('breathes slowly in idle, and more than when only standing', () => {
    const swing = (name: 'idle' | 'standing'): number => {
      const breaths = TIMES.map((t) => absentPose('esceptico', name, t).breath);
      return Math.max(...breaths) - Math.min(...breaths);
    };
    expect(swing('idle')).toBeGreaterThan(swing('standing'));
    // Lento: entre dos instantes muy cercanos apenas cambia.
    const now = absentPose('cientifica', 'idle', 3).breath;
    const soon = absentPose('cientifica', 'idle', 3.1).breath;
    expect(Math.abs(now - soon)).toBeLessThan(0.003);
  });

  it('keeps both feet on the ground while standing', () => {
    for (const who of ABSENT_WHO) {
      for (const name of ['standing', 'idle', 'frozen'] as const) {
        const pose = absentPose(who, name, 5);
        for (const side of [0, 1] as const) {
          const leg = legChain(pose, side);
          expect(leg.ankle.z).toBeCloseTo(ABSENT_JOINTS.ankle[2], 2);
          expect(Math.abs(leg.footPitch)).toBeLessThan(0.02);
        }
      }
    }
  });
});

describe('sitting down', () => {
  it('rests the hips on the seat and the feet flat on the floor, on the bench and on the cot', () => {
    for (const who of ABSENT_WHO) {
      for (const [name, seat] of [
        ['seated', DEFAULT_SEAT.seated],
        ['slumped', DEFAULT_SEAT.slumped],
        ['seated', 0.6],
      ] as const) {
        const pose = absentPose(who, name, 2, { seatHeight: seat });
        for (const side of [0, 1] as const) {
          const leg = legChain(pose, side);
          // El muslo apoya en el asiento: la cadera queda a un radio de muslo por encima.
          expect(leg.hip.z - thighRadius(who)).toBeCloseTo(seat, 2);
          expect(leg.ankle.z).toBeCloseTo(ABSENT_JOINTS.ankle[2], 2);
          expect(Math.abs(leg.footPitch)).toBeLessThan(0.02);
          // Las rodillas, por delante de la cadera; los pies, bajo las rodillas o un poco más allá.
          expect(leg.knee.y - leg.hip.y).toBeGreaterThan(0.4);
          expect(leg.ankle.y).toBeGreaterThan(leg.knee.y - 0.1);
        }
      }
    }
  });

  it('sits on the Mirador bench of Umbral by default (its stone seat is 0.52 m high)', () => {
    expect(DEFAULT_SEAT.seated).toBeCloseTo(0.52, 2);
    expect(DEFAULT_SEAT.slumped).toBeLessThan(DEFAULT_SEAT.seated);
  });

  it('puts the hands on the thighs when seated', () => {
    for (const who of ABSENT_WHO) {
      const pose = absentPose(who, 'seated', 1);
      for (const side of [0, 1] as const) {
        const leg = legChain(pose, side);
        const arm = armChain(pose, side);
        const along = (arm.wrist.y - leg.hip.y) / (leg.knee.y - leg.hip.y);
        expect(along).toBeGreaterThan(0.3);
        expect(along).toBeLessThan(0.8);
        // Por encima del muslo, a un palmo como mucho.
        const thighTop = leg.hip.z + (leg.knee.z - leg.hip.z) * along + thighRadius(who);
        expect(arm.wrist.z).toBeGreaterThan(thighTop - 0.01);
        expect(arm.wrist.z).toBeLessThan(thighTop + 0.12);
      }
    }
  });

  it('bows him over his knees on the cot: the head well below and ahead of the standing head', () => {
    const slumped = absentPose('esceptico', 'slumped', 4);
    const standing = absentPose('esceptico', 'standing', 4);
    const lean = (p: AbsentPose): number => p.spinePitch + p.chestPitch + p.neckPitch + p.headPitch;
    expect(lean(slumped)).toBeLessThan(lean(standing) - 0.6);
    expect(slumped.shrug).toBeLessThan(standing.shrug);
    expect(slumped.sign).toBeLessThan(standing.sign);
    // Las manos cuelgan entre las rodillas, más abajo que ellas.
    const arm = armChain(slumped, 0);
    const leg = legChain(slumped, 0);
    expect(arm.wrist.z).toBeLessThan(leg.knee.z + 0.05);
    expect(arm.wrist.y).toBeGreaterThan(leg.knee.y - 0.25);
  });

  it('pulses both signs together when they sit side by side (the same heartbeat)', () => {
    for (const t of [0, 1.3, 7.9, 22]) {
      expect(absentPose('cientifica', 'seated', t).sign).toBeCloseTo(
        absentPose('esceptico', 'seated', t).sign,
        6,
      );
    }
    // De pie, cada uno a su ritmo.
    const apart = TIMES.some(
      (t) =>
        Math.abs(
          absentPose('cientifica', 'idle', t).sign - absentPose('esceptico', 'idle', t).sign,
        ) > 0.05,
    );
    expect(apart).toBe(true);
  });

  it('can turn the head towards the one beside, within a gentle limit', () => {
    const left = absentPose('cientifica', 'seated', 0, { look: 0.4 });
    const far = absentPose('cientifica', 'seated', 0, { look: 3 });
    expect(left.headYaw).toBeCloseTo(0.4, 5);
    expect(far.headYaw).toBeLessThanOrEqual(0.7);
  });
});

describe('who is who, by the way they stand', () => {
  it('holds her upright and him stooped, with his shoulders down', () => {
    const her = absentPose('cientifica', 'standing', 0);
    const him = absentPose('esceptico', 'standing', 0);
    const lean = (p: AbsentPose): number => p.spinePitch + p.chestPitch + p.neckPitch;
    expect(lean(her)).toBeGreaterThan(-0.05);
    expect(lean(him)).toBeLessThan(lean(her) - 0.25);
    expect(him.shrug).toBeLessThan(her.shrug - 0.03);
    expect(him.headPitch + lean(him)).toBeLessThan(her.headPitch + lean(her));
  });

  it('lets the arms hang from the shoulders, also from his stooped back', () => {
    for (const who of ABSENT_WHO) {
      const pose = absentPose(who, 'standing', 0);
      const arm = armChain(pose, 1);
      // La mano, bajo el hombro y un poco por delante, nunca por detrás de la cadera.
      expect(arm.wrist.z).toBeLessThan(arm.shoulder.z - 0.8);
      expect(arm.wrist.y).toBeGreaterThan(-0.05);
      expect(arm.wrist.y).toBeLessThan(0.3);
    }
  });
});

describe('going from one pose to another', () => {
  it('blends two poses: the ends are the poses themselves', () => {
    const a = absentPose('cientifica', 'standing', 1);
    const b = absentPose('cientifica', 'seated', 1);
    expect(largestJump(mixAbsentPose(a, b, 0), a)).toBe(0);
    expect(largestJump(mixAbsentPose(a, b, 1), b)).toBeLessThan(1e-12);
    expect(mixAbsentPose(a, b, 0.5).bob).toBeCloseTo((a.bob + b.bob) / 2, 6);
  });

  it('wakes her from the frost slowly and without a jump, even if the pose changes halfway', () => {
    let poser = createAbsentPoser('cientifica', 'frozen');
    let previous = currentAbsentPose(poser);
    const frost: number[] = [];
    for (let k = 1; k <= 60 * 12; k++) {
      if (k === 60) poser = switchAbsentPose(poser, 'standing');
      if (k === 60 * 3) poser = switchAbsentPose(poser, 'idle'); // a medio despertar
      poser = advanceAbsentPoser(poser, 1 / 60);
      const next = currentAbsentPose(poser);
      expect(largestJump(previous, next)).toBeLessThan(0.03);
      frost.push(next.frost);
      previous = next;
    }
    // La escarcha se va poco a poco y del todo.
    expect(frost[60 * 2]).toBeGreaterThan(0.3);
    expect(frost.at(-1)).toBe(0);
    for (let k = 1; k < frost.length; k++)
      expect(frost[k]).toBeLessThanOrEqual((frost[k - 1] ?? 1) + 1e-9);
  });

  it('sits down and stands up continuously, and ends in the target pose', () => {
    let poser = createAbsentPoser('esceptico', 'standing');
    poser = switchAbsentPose(poser, 'slumped');
    let previous = currentAbsentPose(poser);
    for (let k = 1; k <= 60 * 6; k++) {
      poser = advanceAbsentPoser(poser, 1 / 60);
      const next = currentAbsentPose(poser);
      expect(largestJump(previous, next)).toBeLessThan(0.03);
      previous = next;
    }
    expect(largestJump(previous, absentPose('esceptico', 'slumped', poser.time))).toBeLessThan(
      1e-9,
    );
  });

  it('ignores a switch to the pose it already has, and odd time steps', () => {
    const poser = createAbsentPoser('cientifica', 'idle');
    expect(switchAbsentPose(poser, 'idle')).toBe(poser);
    const later = advanceAbsentPoser(poser, Number.NaN);
    expect(later.time).toBe(poser.time);
    const back = advanceAbsentPoser(poser, -3);
    expect(back.time).toBe(poser.time);
  });
});
