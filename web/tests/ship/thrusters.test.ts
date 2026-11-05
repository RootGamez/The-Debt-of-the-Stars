import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  allocateThrust,
  createThrustLevels,
  createThrustOutput,
  THRUSTERS,
  thrustOf,
  VISIBLE_THRUST,
} from '../../src/ship/thrusters';

function allocate(linear: Vector3, angular = new Vector3(), levels = createThrustLevels()) {
  const out = allocateThrust(linear, angular, levels, createThrustOutput());
  return { out, levels };
}

function firing(levels: Float32Array, threshold = VISIBLE_THRUST): string[] {
  return THRUSTERS.filter((_, i) => (levels[i] ?? 0) > threshold).map((t) => t.id);
}

describe('the thruster layout', () => {
  it('has a nozzle pushing in each of the six directions', () => {
    const directions = THRUSTERS.map((t) => t.direction);
    for (const axis of [
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, -1, 0),
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    ]) {
      expect(directions.some((d) => d.dot(axis) > 0.99)).toBe(true);
    }
  });

  it('is symmetric: the manoeuvring nozzles at full push the ship nowhere and do not spin it', () => {
    const levels = createThrustLevels();
    THRUSTERS.forEach((t, i) => {
      if (t.group === 'rcs') levels[i] = 1;
    });
    const out = thrustOf(levels, createThrustOutput());

    expect(out.linear.length()).toBeLessThan(1e-9);
    expect(out.angular.length()).toBeLessThan(1e-9);
  });
});

describe('allocateThrust', () => {
  it('fires the main engines to go forward, without spinning the ship', () => {
    const { out, levels } = allocate(new Vector3(0, 0, -15));

    expect(out.linear.z).toBeCloseTo(-15, 1);
    expect(Math.hypot(out.linear.x, out.linear.y)).toBeLessThan(0.2);
    expect(out.angular.length()).toBeLessThan(0.05);
    expect(firing(levels)).toEqual(expect.arrayContaining(['main_babor', 'main_estribor']));
  });

  it('fires the belly to climb and the rim to go down', () => {
    const up = allocate(new Vector3(0, 20, 0));
    const down = allocate(new Vector3(0, -10, 0));

    expect(up.out.linear.y).toBeCloseTo(20, 1);
    expect(firing(up.levels).some((id) => id.startsWith('lift_'))).toBe(true);
    expect(down.out.linear.y).toBeCloseTo(-10, 1);
    expect(firing(down.levels).every((id) => id.endsWith('_abajo'))).toBe(true);
  });

  it('strafes with the side nozzles of the bow and the stern', () => {
    const { out, levels } = allocate(new Vector3(8, 0, 0));

    expect(out.linear.x).toBeCloseTo(8, 1);
    expect(out.angular.length()).toBeLessThan(0.05);
    // Las de babor y estribor solo corrigen un poco el alabeo (las del borde están algo por debajo del centro).
    expect(firing(levels, 0.25).sort()).toEqual(['rcs_popa_mas', 'rcs_proa_mas']);
  });

  it('turns with pairs of nozzles that push in opposite directions (no drift)', () => {
    const yaw = allocate(new Vector3(), new Vector3(0, 2, 0));
    const pitch = allocate(new Vector3(), new Vector3(1.5, 0, 0));

    expect(yaw.out.angular.y).toBeCloseTo(2, 1);
    expect(yaw.out.linear.length()).toBeLessThan(0.2);
    expect(pitch.out.angular.x).toBeCloseTo(1.5, 1);
    expect(pitch.out.linear.length()).toBeLessThan(0.2);
    // Morro arriba: algo empuja hacia arriba en la proa y algo hacia abajo en la popa.
    const lit = THRUSTERS.filter((t) => firing(pitch.levels).includes(t.id));
    expect(lit.some((t) => t.position.z < 0 && t.direction.y > 0.99)).toBe(true);
    expect(lit.some((t) => t.position.z > 0 && t.direction.y < -0.99)).toBe(true);
  });

  it('flying forward only the stern engines burn: nothing at the bow, in front of the window', () => {
    const { levels } = allocate(new Vector3(0, 0, -12));

    const lit = firing(levels);
    expect(lit).toEqual(expect.arrayContaining(['main_babor', 'main_estribor']));
    expect(lit.filter((id) => id.includes('proa') || id.startsWith('retro'))).toEqual([]);
  });

  it('braking, the retro rockets at the bow burn towards the front', () => {
    const { levels } = allocate(new Vector3(0, 0, 8));

    expect(firing(levels)).toEqual(expect.arrayContaining(['retro_babor', 'retro_estribor']));
    const retro = THRUSTERS.find((t) => t.id === 'retro_babor');
    expect(retro?.position.z).toBeLessThan(0);
    expect(retro?.direction.z).toBeGreaterThan(0.99);
  });

  it('gives what it can when asked for more than the nozzles have', () => {
    const { out, levels } = allocate(new Vector3(0, -100, 0));

    expect(out.linear.y).toBeLessThan(-10);
    expect(out.linear.y).toBeGreaterThan(-100);
    for (const level of levels) {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });

  it('switches everything off when nothing is asked, even starting from full', () => {
    const { out, levels } = allocate(new Vector3(), new Vector3(), createThrustLevels().fill(1));

    expect(out.linear.length()).toBeLessThan(0.1);
    expect(out.angular.length()).toBeLessThan(0.02);
    expect(firing(levels, 0.02)).toEqual([]);
  });

  it('survives absurd requests', () => {
    const levels = createThrustLevels();
    levels[0] = Number.NaN;
    const { out } = allocate(new Vector3(Number.NaN, Infinity, 3), new Vector3(), levels);

    expect(Number.isFinite(out.linear.length())).toBe(true);
    expect(levels.every((l) => l >= 0 && l <= 1)).toBe(true);
  });
});
