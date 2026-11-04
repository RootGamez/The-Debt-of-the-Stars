// El andar del explorador: la fase avanza con lo andado, las piernas van en contra y los brazos al revés que
// ellas, y la pose cambia al correr, saltar, caer y nadar.
import { describe, expect, it } from 'vitest';
import {
  createGait,
  gaitPose,
  stepGait,
  STRIDE_RUN,
  STRIDE_WALK,
  type GaitInput,
  type GaitState,
  type BodyPose,
} from '../../src/character/gait';
import { RUN_SPEED, WALK_SPEED } from '../../src/data/movement';

const STEP = 1 / 60;

function input(overrides: Partial<GaitInput> = {}): GaitInput {
  return {
    dt: STEP,
    speed: 0,
    forward: 1,
    grounded: true,
    swimming: false,
    verticalSpeed: 0,
    turnRate: 0,
    landings: 0,
    landingSpeed: 0,
    ...overrides,
  };
}

/** Avanza `seconds` con la misma entrada. */
function run(state: GaitState, seconds: number, overrides: Partial<GaitInput> = {}): void {
  for (let t = 0; t < seconds; t += STEP) stepGait(state, input(overrides));
}

function allAngles(pose: BodyPose): number[] {
  return [
    pose.bob,
    pose.sway,
    pose.pelvisRoll,
    pose.pelvisYaw,
    pose.torsoPitch,
    pose.torsoYaw,
    pose.torsoRoll,
    pose.headPitch,
    pose.breath,
    pose.pack,
    ...pose.legs.flatMap((l) => [l.hip, l.hipRoll, l.knee, l.ankle]),
    ...pose.arms.flatMap((a) => [a.shoulder, a.shoulderRoll, a.elbow, a.wrist]),
  ];
}

describe('the phase of the gait', () => {
  it('advances one full cycle per stride walked', () => {
    const gait = createGait();
    run(gait, 0.5, { speed: WALK_SPEED });
    const before = gait.phase;
    run(gait, 1, { speed: WALK_SPEED });
    const cycles = (gait.phase - before) / (2 * Math.PI);
    expect(cycles).toBeCloseTo(WALK_SPEED / STRIDE_WALK, 1);
  });

  it('takes longer strides when running', () => {
    expect(STRIDE_RUN).toBeGreaterThan(STRIDE_WALK);
  });

  it('runs the legs backwards when walking backwards', () => {
    const gait = createGait();
    run(gait, 0.5, { speed: WALK_SPEED, forward: -1 });
    expect(gait.phase).toBeLessThan(0);
  });

  it('shuffles the feet when turning on the spot', () => {
    const gait = createGait();
    run(gait, 0.5, { turnRate: 3 });
    expect(Math.abs(gait.phase)).toBeGreaterThan(0.5);
    const still = createGait();
    run(still, 0.5);
    expect(still.phase).toBe(0);
  });
});

describe('the pose while walking', () => {
  const walking = (): GaitState => {
    const gait = createGait();
    run(gait, 1, { speed: WALK_SPEED });
    return gait;
  };

  it('swings the legs against each other and the arms against the legs', () => {
    const gait = walking();
    for (const phase of [0.4, 1.2, 2, 3.5, 5]) {
      gait.phase = phase;
      const pose = gaitPose(gait, 0);
      const [left, right] = pose.legs;
      const [leftArm, rightArm] = pose.arms;
      expect(Math.sign(left.hip)).toBe(-Math.sign(right.hip));
      expect(Math.sign(leftArm.shoulder)).toBe(-Math.sign(left.hip));
      expect(Math.sign(rightArm.shoulder)).toBe(-Math.sign(right.hip));
    }
  });

  it('bends the knee of the leg that swings forward', () => {
    const gait = walking();
    gait.phase = 0; // la izquierda pasa por debajo hacia delante
    const pose = gaitPose(gait, 0);
    expect(pose.legs[0].knee).toBeGreaterThan(pose.legs[1].knee + 0.3);
  });

  it('keeps the boots almost level with the ground', () => {
    const gait = walking();
    for (let phase = 0; phase < 2 * Math.PI; phase += 0.3) {
      gait.phase = phase;
      for (const leg of gaitPose(gait, 0).legs) {
        expect(Math.abs(leg.hip - leg.knee + leg.ankle)).toBeLessThan(0.45);
      }
    }
  });

  it('bobs twice per cycle and leans towards the leg it stands on', () => {
    const gait = walking();
    const bobs: number[] = [];
    const sways: number[] = [];
    for (let k = 0; k < 64; k++) {
      gait.phase = (k / 64) * 2 * Math.PI;
      const pose = gaitPose(gait, 0);
      bobs.push(pose.bob);
      sways.push(pose.sway);
    }
    const peaks = bobs.filter((b, k) => {
      const prev = bobs[(k + 63) % 64] ?? 0;
      const next = bobs[(k + 1) % 64] ?? 0;
      return b > prev && b >= next;
    });
    expect(peaks).toHaveLength(2);
    // Con el pie izquierdo apoyado (cos φ < 0) el cuerpo se va a la izquierda (−X).
    gait.phase = Math.PI;
    expect(gaitPose(gait, 0).sway).toBeLessThan(0);
  });

  it('leans forward more when running', () => {
    const walk = walking();
    const fast = createGait();
    run(fast, 1, { speed: RUN_SPEED });
    expect(gaitPose(fast, 0).torsoPitch).toBeLessThan(gaitPose(walk, 0).torsoPitch);
  });

  it('settles back to standing when it stops', () => {
    const gait = walking();
    run(gait, 1.5);
    const pose = gaitPose(gait, 0);
    for (const leg of pose.legs) expect(Math.abs(leg.hip)).toBeLessThan(0.05);
    expect(gait.move).toBeLessThan(0.02);
  });
});

describe('the pose off the ground', () => {
  it('tucks the legs and lifts the arms while in the air', () => {
    const gait = createGait();
    run(gait, 0.4, { grounded: false, verticalSpeed: 3 });
    const pose = gaitPose(gait, 0);
    expect(gait.air).toBeGreaterThan(0.9);
    for (const leg of pose.legs) expect(leg.knee).toBeGreaterThan(0.5);
    for (const arm of pose.arms) expect(arm.shoulderRoll).toBeGreaterThan(0.3);
  });

  it('crouches for a moment after a hard landing', () => {
    const gait = createGait();
    run(gait, 0.3);
    stepGait(gait, input({ landings: 1, landingSpeed: 8 }));
    const landed = gaitPose(gait, 0);
    run(gait, 1, { landings: 1 });
    const later = gaitPose(gait, 0);
    expect(landed.bob).toBeLessThan(later.bob - 0.03);
    expect(landed.legs[0].knee).toBeGreaterThan(later.legs[0].knee);
  });

  it('paddles when swimming', () => {
    const gait = createGait();
    run(gait, 1, { swimming: true, grounded: false });
    expect(gait.swim).toBeGreaterThan(0.9);
    const hips = new Set<number>();
    for (let k = 0; k < 4; k++) {
      run(gait, 0.1, { swimming: true, grounded: false });
      hips.add(Math.round(gaitPose(gait, 0).legs[0].hip * 100));
    }
    expect(hips.size).toBeGreaterThan(1); // las piernas patalean aunque no avance
  });
});

describe('the head and the look', () => {
  it('tilts the head with the look, a bit less than the camera', () => {
    const gait = createGait();
    const up = gaitPose(gait, 0.8).headPitch;
    const down = gaitPose(gait, -0.8).headPitch;
    expect(up).toBeGreaterThan(0.2);
    expect(up).toBeLessThan(0.8);
    expect(down).toBeLessThan(-0.2);
  });

  it('breathes while standing still', () => {
    const gait = createGait();
    const breaths = new Set<number>();
    for (let k = 0; k < 6; k++) {
      run(gait, 0.3);
      breaths.add(Math.round(gaitPose(gait, 0).breath * 1000));
    }
    expect(breaths.size).toBeGreaterThan(2);
  });
});

describe('a robust gait', () => {
  it('stays finite and bounded with odd input', () => {
    const gait = createGait();
    const odd: Partial<GaitInput>[] = [
      { dt: 0 },
      { dt: 5, speed: 400 },
      { speed: Number.NaN },
      { turnRate: Number.POSITIVE_INFINITY },
      { grounded: false, verticalSpeed: -900 },
      { landings: 3, landingSpeed: 1e6 },
    ];
    for (const o of odd) {
      stepGait(gait, input(o));
      for (const value of allAngles(gaitPose(gait, Number.NaN))) {
        expect(Number.isFinite(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThan(Math.PI);
      }
    }
  });
});
