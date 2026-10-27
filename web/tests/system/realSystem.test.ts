// El sistema real (sistema.json + los .glb) cumple lo que el diseño espera, sea cual sea la fase de las órbitas.
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import systemData from '../../src/data/sistema.json';
import { toSystemPosition } from '../../src/system/frames';
import {
  clockRateAt,
  pickReference,
  SPHERE_RADII,
  type ClockBody,
  type Sphere,
} from '../../src/system/influence';
import { bodyPose } from '../../src/system/orbits';
import { parseSystem } from '../../src/system/systemData';
import { WORLD_IDS } from '../../src/worlds/worldSelection';
import { loadBuiltWorld } from '../helpers/builtWorlds';

const system = parseSystem(systemData, WORLD_IDS);
const CYCLE = 900;
const SAMPLE_STEP = 11;

async function infoOfAll() {
  const entries = await Promise.all(
    system.bodies.map(async (b) => [b.world, (await loadBuiltWorld(b.world)).info] as const),
  );
  return new Map(entries);
}

describe('the real system, at any moment of the cycle', () => {
  it('gives each world its own clock rate and reference frame on its surface', async () => {
    const infos = await infoOfAll();

    for (let t = 0; t <= CYCLE; t += SAMPLE_STEP) {
      const bodies: ClockBody[] = [];
      const spheres: Sphere[] = [];
      for (const body of system.bodies) {
        const info = infos.get(body.world);
        if (!info) throw new Error(`falta ${body.world}`);
        const pose = bodyPose(body, t);
        bodies.push({ center: pose.position.clone(), radius: info.radius, rate: info.clockRate });
        spheres.push({
          world: body.world,
          center: pose.position.clone(),
          radius: info.radius * SPHERE_RADII,
        });
      }

      for (const body of system.bodies) {
        const info = infos.get(body.world);
        if (!info) throw new Error(`falta ${body.world}`);
        const pose = bodyPose(body, t);
        const feet = toSystemPosition(pose, new Vector3(0, info.radius, 0), new Vector3());

        expect(clockRateAt(feet, bodies)).toBeCloseTo(info.clockRate, 9);
        expect(pickReference(feet, spheres)).toBe(body.world);
      }
    }
  });

  it('never lets two worlds claim the same spot as their own surface', async () => {
    const infos = await infoOfAll();

    for (let t = 0; t <= CYCLE; t += SAMPLE_STEP) {
      const poses = system.bodies.map((b) => ({ body: b, pose: bodyPose(b, t) }));
      for (const a of poses) {
        for (const b of poses) {
          if (a.body.world >= b.body.world) continue;
          const radii =
            (infos.get(a.body.world)?.radius ?? Infinity) +
            (infos.get(b.body.world)?.radius ?? Infinity);

          expect(a.pose.position.distanceTo(b.pose.position)).toBeGreaterThan(radii);
        }
      }
    }
  });
});
