import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { TargetingSystem } from '../../src/ship/targeting';

describe('TargetingSystem', () => {
  const bodies = [
    { id: 'taller', name: 'Taller' },
    { id: 'cicatriz', name: 'Cicatriz' },
    { id: 'archivo', name: 'Archivo' },
    { id: 'umbral', name: 'Umbral' },
    { id: 'observatorio', name: 'Observatorio' },
  ];

  it('cycles through available targets with cycleTarget()', () => {
    const targeting = new TargetingSystem(bodies);
    expect(targeting.currentTarget).toBeUndefined();

    targeting.cycleTarget();
    expect(targeting.currentTarget?.id).toBe('taller');

    targeting.cycleTarget();
    expect(targeting.currentTarget?.id).toBe('cicatriz');

    targeting.cycleTarget();
    expect(targeting.currentTarget?.id).toBe('archivo');

    targeting.cycleTarget();
    expect(targeting.currentTarget?.id).toBe('umbral');

    targeting.cycleTarget();
    expect(targeting.currentTarget?.id).toBe('observatorio');

    // Vuelve al inicio o deselecciona
    targeting.cycleTarget();
    expect(targeting.currentTarget?.id).toBe('taller');
  });

  it('skips a hidden body (the Nudo) until it is revealed', () => {
    const targeting = new TargetingSystem([
      { id: 'umbral', name: 'Umbral' },
      { id: 'laboratorio', name: 'Laboratorio', hidden: true },
      { id: 'observatorio', name: 'Observatorio' },
    ]);
    let near = false;
    const revealed = (id: string) => id !== 'laboratorio' || near;

    const ids = [1, 2, 3].map(() => targeting.cycleTarget(revealed)?.id);
    expect(ids).toEqual(['umbral', 'observatorio', 'umbral']);

    near = true;
    expect(targeting.cycleTarget(revealed)?.id).toBe('laboratorio');
  });

  it('finds nothing to cycle to when every body is hidden', () => {
    const targeting = new TargetingSystem([
      { id: 'laboratorio', name: 'Laboratorio', hidden: true },
    ]);

    expect(targeting.cycleTarget(() => false)).toBeUndefined();
  });

  it('allows clearing target', () => {
    const targeting = new TargetingSystem(bodies);
    targeting.cycleTarget();
    expect(targeting.currentTarget).toBeDefined();

    targeting.clearTarget();
    expect(targeting.currentTarget).toBeUndefined();
  });

  it('computes distance and relative velocity to target', () => {
    const targeting = new TargetingSystem(bodies);
    targeting.setTarget('taller');

    const shipPos = new Vector3(0, 0, 0);
    const shipVel = new Vector3(0, 10, 0);

    const targetPos = new Vector3(300, 400, 0);
    const targetVel = new Vector3(0, 0, 0);

    const distance = targeting.distanceTo(shipPos, targetPos);
    expect(distance).toBeCloseTo(500, 1);

    const relVel = targeting.relativeVelocity(shipVel, targetVel);
    expect(relVel.length()).toBeCloseTo(10, 1);
  });
});
