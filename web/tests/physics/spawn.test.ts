import { describe, expect, it } from 'vitest';
import { Object3D, Vector3 } from 'three';
import { chooseSpawn, spawnOnGround } from '../../src/physics/spawn';
import { upOf } from '../../src/physics/surfaceFrame';
import type { CollisionWorld } from '../../src/physics/collisionWorld';

/** Mundo de prueba: una esfera de radio 90 a la que se le puede lanzar un rayo. */
const sphere: CollisionWorld & {
  raycast(o: Vector3, d: Vector3, max: number): number | null;
} = {
  resolve: (_capsule, correction) => (correction.set(0, 0, 0), false),
  raycast(origin, direction, max) {
    const b = origin.dot(direction);
    const c = origin.lengthSq() - 90 * 90;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t >= 0 && t <= max ? t : null;
  },
};

function marker(position: Vector3): Object3D {
  const o = new Object3D();
  o.position.copy(position);
  o.updateMatrixWorld(true);
  return o;
}

describe('spawnOnGround', () => {
  it('puts the feet on the ground straight below the marker', () => {
    const start = spawnOnGround(marker(new Vector3(0, 0, 91)), sphere, new Vector3());

    expect(start.feet.z).toBeCloseTo(90);
    expect(start.feet.x).toBeCloseTo(0);
  });

  it('stands upright: up points away from the planet center', () => {
    const start = spawnOnGround(marker(new Vector3(91, 0, 0)), sphere, new Vector3());

    const up = upOf(start.body);
    expect(up.x).toBeCloseTo(1);
  });

  it('inside a hollow world, stands on the inner face with the head toward the center', () => {
    // La cara de dentro de una esfera de 21 m: el rayo sale hacia fuera desde el punto.
    const cavity = {
      resolve: () => false,
      raycast(origin: Vector3, direction: Vector3, max: number): number | null {
        const b = origin.dot(direction);
        const c = origin.lengthSq() - 21 * 21;
        const t = -b + Math.sqrt(b * b - c);
        return t >= 0 && t <= max ? t : null;
      },
    };
    const well = {
      center: new Vector3(),
      radius: 25,
      strength: 3,
      range: 50,
      innerRadius: 21,
    };

    const start = spawnOnGround(marker(new Vector3(0, -20, 0)), cavity, well);

    expect(start.feet.y).toBeCloseTo(-21);
    expect(upOf(start.body).y).toBeCloseTo(1);
  });

  it('fails with a clear message when there is no ground below the marker', () => {
    const lost = marker(new Vector3(0, 0, 500));
    lost.name = 'SPAWN_Perdido';

    expect(() => spawnOnGround(lost, sphere, new Vector3(0, 0, 1000))).toThrow(/SPAWN_Perdido/);
  });
});

describe('chooseSpawn', () => {
  function spawns(...names: string[]): Map<string, Object3D> {
    return new Map(names.map((n) => [n, marker(new Vector3())]));
  }

  it('prefers the arrival point at La Boca', () => {
    expect(chooseSpawn(spawns('SPAWN_Aula', 'SPAWN_LaBoca'))?.[0]).toBe('SPAWN_LaBoca');
  });

  it('falls back to the first spawn in name order', () => {
    expect(chooseSpawn(spawns('SPAWN_Zeta', 'SPAWN_Alfa'))?.[0]).toBe('SPAWN_Alfa');
  });

  it('returns undefined when the world has no spawn', () => {
    expect(chooseSpawn(new Map())).toBeUndefined();
  });
});
