import { Quaternion, Vector3 } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { Player } from '../../src/core/player';
import {
  MAX_SLOPE_DEGREES,
  PHYSICS_STEP,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
} from '../../src/data/movement';
import type { GravityWell } from '../../src/physics/gravity';
import { withMovingCollider } from '../../src/physics/movingCollider';
import { lookAlong } from '../../src/physics/surfaceFrame';
import { createCapsule, createContact } from '../../src/physics/collisionWorld';
import { buildAlbatros, type ShipModel } from '../../src/ship/model/albatros';
import {
  BELLY_Y,
  CLEARANCE,
  FLOOR_RADIUS,
  FLOOR_Y,
  inWell,
  LADDER_ANGLE,
  LADDER_FOOT,
  LADDER_LENGTH,
  LADDER_TOP,
  RIM_RADIUS,
  WELL,
} from '../../src/ship/model/albatrosShape';
import { THRUSTERS } from '../../src/ship/thrusters';
import { resolveShipContact } from '../../src/ship/shipContact';
import { createShipState } from '../../src/ship/shipPhysics';
import { spawnOnGround } from '../../src/physics/spawn';
import { createWorldRuntime } from '../../src/worlds/worldRuntime';
import { loadBuiltWorld } from '../helpers/builtWorlds';
import { sphereWorld } from '../helpers/testWorlds';

const UP = new Vector3(0, 1, 0);
let model: ShipModel;

beforeAll(() => {
  model = buildAlbatros();
});

/** Resuelve una cápsula de jugador con los pies en `feet` contra la nave. */
function standAt(feet: Vector3) {
  const capsule = createCapsule(PLAYER_RADIUS);
  capsule.start.copy(feet).addScaledVector(UP, PLAYER_RADIUS);
  capsule.end.copy(feet).addScaledVector(UP, PLAYER_HEIGHT - PLAYER_RADIUS);
  const contact = createContact();
  const touching = model.interior.resolve(capsule, UP, contact);
  return { touching, contact };
}

describe('the round Albatros II', () => {
  it('is a disc of 9 m that lands on legs 3 m below its centre', () => {
    expect(RIM_RADIUS * 2).toBeCloseTo(9, 1);
    expect(model.hull.clearance).toBe(CLEARANCE);
    const lowest = Math.min(...model.hull.spheres.map((s) => s.center.y - s.radius));
    expect(lowest).toBeCloseTo(-CLEARANCE, 6);
    for (const sphere of model.hull.spheres) {
      expect(sphere.center.length() + sphere.radius).toBeLessThanOrEqual(model.hull.radius + 1e-6);
    }
  });

  it('has a flame for each thruster, off at the start', () => {
    expect(model.flames).toHaveLength(THRUSTERS.length);
    expect(model.flames.every((flame) => !flame.visible)).toBe(true);
  });

  it('keeps a reasonable number of triangles (the budget is a guide, ✅ Anthony)', () => {
    expect(model.triangles).toBeGreaterThan(3000);
    expect(model.triangles).toBeLessThan(40000);
  });

  it('has a see-through glass dome and front window', () => {
    const material = model.glass.material as { transparent: boolean; depthWrite: boolean };
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
  });
});

describe('walking inside the landed ship', () => {
  it('stands on the floor of the room', () => {
    const { contact } = standAt(new Vector3(-1.5, FLOOR_Y - 0.03, -0.5));

    expect(contact.floorDot).toBeGreaterThan(0.95);
    expect(contact.correction.y).toBeCloseTo(0.03, 2);
  });

  it('has room to stand up: nothing touches the head in the middle of the room', () => {
    const { touching } = standAt(new Vector3(-1.2, FLOOR_Y + 0.02, -0.6));

    expect(touching).toBe(false);
  });

  it('is closed by its wall', () => {
    const { contact } = standAt(new Vector3(FLOOR_RADIUS - 0.3, FLOOR_Y + 0.05, 0));

    expect(contact.correction.x).toBeLessThan(-0.02);
  });

  it('opens a hatch in the floor towards the stern', () => {
    expect(inWell(0, (WELL.minZ + WELL.maxZ) / 2)).toBe(true);
    expect(inWell(0, -1)).toBe(false);
    const { contact } = standAt(new Vector3(0, FLOOR_Y + 0.3, 2.9));
    // Sobre el pozo no hay suelo de tablas: solo la escalerilla, más abajo.
    expect(contact.correction.y).toBeLessThan(0.05);
  });

  it('lowers a ladder that reaches the ground and can be walked up', () => {
    const along = new Vector3(0, -Math.sin(LADDER_ANGLE), Math.cos(LADDER_ANGLE));
    const foot = LADDER_TOP.clone().addScaledVector(along, LADDER_LENGTH);
    expect(foot.y).toBeCloseTo(-CLEARANCE, 6);
    expect(LADDER_ANGLE).toBeLessThan((MAX_SLOPE_DEGREES * Math.PI) / 180);

    const middle = LADDER_TOP.clone().addScaledVector(along, LADDER_LENGTH / 2);
    const { contact } = standAt(middle.addScaledVector(UP, -0.02));
    expect(contact.floorDot).toBeGreaterThan(Math.cos((MAX_SLOPE_DEGREES * Math.PI) / 180));
  });

  it('walks up the ladder from the ground into the room', () => {
    // La nave posada sobre un mundo grande (casi plano), con la panza abierta bajo el pozo.
    const R = 2000;
    const well: GravityWell = { center: new Vector3(), radius: R, strength: 9.8, range: 2 * R };
    const shipAt = new Vector3(0, R + CLEARANCE, 0);
    const world = withMovingCollider(sphereWorld(new Vector3(), R), () => ({
      world: model.interior,
      position: shipAt,
      orientation: new Quaternion(),
    }));
    const feet = LADDER_FOOT.clone()
      .add(shipAt)
      .setY(R + 0.01);
    const player = new Player(
      { feet, body: lookAlong(UP, new Vector3(0, 0, -1)) },
      { wells: [well], world },
      well,
    );

    for (let i = 0; i < 150; i++)
      player.step({ x: 0, z: 1, run: false, jump: false }, PHYSICS_STEP);

    const inShip = player.state.position.clone().sub(shipAt);
    expect(inShip.y).toBeCloseTo(FLOOR_Y, 1);
    expect(inShip.z).toBeLessThan(WELL.minZ);
  });

  it('leaves room under the belly to walk out from the ladder', () => {
    expect(BELLY_Y - -CLEARANCE).toBeGreaterThan(PLAYER_HEIGHT + 0.15);
  });

  it('has the seat, the logbook and the map within the room', () => {
    for (const station of model.stations) {
      expect(Math.hypot(station.position.x, station.position.z)).toBeLessThan(FLOOR_RADIUS);
      expect(station.position.y).toBeGreaterThan(FLOOR_Y);
    }
    expect(model.stations.map((s) => s.id).sort()).toEqual(['asiento', 'mapa', 'registro']);
  });
});

describe('where the round ship waits', () => {
  for (const [id, parkName] of [
    ['umbral', 'PARK_Nave'],
    ['hogar', 'PARK_Hangar'],
  ] as const) {
    it(`fits its park in ${id}: in sight of the arrival and resting on its legs, not in the ground`, async () => {
      const world = await loadBuiltWorld(id);
      const runtime = createWorldRuntime(world);
      const park = runtime.world.markers.parks.get(parkName);
      if (!park) throw new Error(`falta ${parkName}`);
      const parked = spawnOnGround(park, runtime.collision, runtime.well.center);
      const up = parked.feet.clone().sub(runtime.well.center).normalize();
      const state = createShipState();
      state.position.copy(parked.feet).addScaledVector(up, model.hull.clearance);
      state.orientation.copy(parked.body);
      const before = state.position.clone();

      resolveShipContact(state, runtime.collision, up, model.hull.spheres);

      // Apoyada en las patas: el casco apenas toca (nada lo empuja más de unos centímetros).
      expect(state.position.distanceTo(before)).toBeLessThan(0.25);
      if (id === 'umbral') {
        const arrival = runtime.spawn.feet;
        expect(arrival.distanceTo(before)).toBeGreaterThan(model.hull.radius + 2);
        expect(arrival.distanceTo(before)).toBeLessThan(30);
      }
    });
  }
});
