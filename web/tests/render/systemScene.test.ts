import { Group, PointLight, Quaternion, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import systemData from '../../src/data/sistema.json';
import { createSystemScene } from '../../src/render/systemScene';
import { bodyPose } from '../../src/system/orbits';
import { parseSystem, type BodySpec, type SystemSpec } from '../../src/system/systemData';
import { WORLD_IDS } from '../../src/worlds/worldSelection';

const system = parseSystem(systemData, WORLD_IDS);

function specOf(world: string): BodySpec {
  const spec = system.bodyOf(world);
  if (!spec) throw new Error(`falta ${world}`);
  return spec;
}

function setup(options: { system?: SystemSpec | undefined; start?: string } = {}) {
  const scene = new Scene();
  const sun = new PointLight(0xffffff, 1, 0, 0);
  sun.position.set(3000, 1500, 2000);
  const sky = new Group();
  const ids = ('system' in options ? options.system : system)
    ? system.bodies.map((b) => b.world)
    : ['hogar'];
  const worlds = new Map(ids.map((id) => [id, { scene: new Group() }]));
  const systemScene = createSystemScene({
    scene,
    system: 'system' in options ? options.system : system,
    worlds,
    sun,
    sky,
    start: options.start ?? ids[0] ?? 'umbral',
  });
  const groupOf = (id: string): Group => {
    const group = systemScene.groupOf(id);
    if (!group) throw new Error(`falta ${id}`);
    return group;
  };
  return { scene, sun, sky, systemScene, groupOf };
}

function sunDirection(sun: PointLight): Vector3 {
  return sun.position.clone().normalize();
}

describe('the system scene, anchored to a world', () => {
  it('leaves the reference world still at the origin and puts the others around it', () => {
    const { systemScene, groupOf } = setup({ start: 'umbral' });

    systemScene.update(123);

    expect(groupOf('umbral').position.length()).toBeLessThan(1e-9);
    expect(groupOf('umbral').quaternion.angleTo(new Quaternion())).toBeLessThan(1e-6);
    const expected = bodyPose(specOf('archivo'), 123)
      .position.clone()
      .sub(bodyPose(specOf('umbral'), 123).position)
      .length();
    expect(groupOf('archivo').position.length()).toBeCloseTo(expected, 6);
  });

  it('keeps the distances between worlds whichever one is the reference', () => {
    const { systemScene, groupOf } = setup({ start: 'umbral' });
    systemScene.update(300);
    const fromUmbral = groupOf('taller').position.distanceTo(groupOf('archivo').position);

    systemScene.setReference('cicatriz');
    systemScene.update(300);

    expect(groupOf('cicatriz').position.length()).toBeLessThan(1e-9);
    expect(groupOf('taller').position.distanceTo(groupOf('archivo').position)).toBeCloseTo(
      fromUmbral,
      6,
    );
  });

  it('puts the Brasa where it is seen from the reference and lights from there', () => {
    const { systemScene, sun } = setup({ start: 'archivo' });

    systemScene.update(50);

    const archivo = bodyPose(specOf('archivo'), 50).position;
    expect(sun.position.length()).toBeCloseTo(archivo.length(), 6);
  });

  it('keeps the Brasa still in the sky of a world that always shows the same face', () => {
    const { systemScene, sun } = setup({ start: 'umbral' });
    systemScene.update(0);
    const first = sunDirection(sun);

    for (const t of [100, 400, 900]) {
      systemScene.update(t);
      expect(sunDirection(sun).distanceTo(first)).toBeLessThan(1e-6);
    }
  });

  it('gives Taller a day of three minutes: the Brasa comes back after 180 s and is opposite after 90 s', () => {
    const { systemScene, sun } = setup({ start: 'taller' });
    systemScene.update(10);
    const morning = sunDirection(sun);

    systemScene.update(100);
    const evening = sunDirection(sun);
    systemScene.update(190);
    const nextMorning = sunDirection(sun);

    expect(nextMorning.distanceTo(morning)).toBeLessThan(1e-6);
    expect(evening.dot(morning)).toBeCloseTo(-1, 6);
  });

  it('turns the stars the opposite way to the reference world', () => {
    const { systemScene, sky } = setup({ start: 'taller' });

    systemScene.update(0);
    const before = sky.quaternion.clone();
    systemScene.update(45);

    expect(sky.quaternion.angleTo(before)).toBeGreaterThan(0.1);
  });

  it('converts a point of the reference frame to the system frame', () => {
    const { systemScene } = setup({ start: 'umbral' });

    const centre = systemScene.toSystem(new Vector3(), 77, new Vector3());

    expect(centre.distanceTo(bodyPose(specOf('umbral'), 77).position)).toBeLessThan(1e-9);
  });

  it('attaches the ship to its world pivot or the open-space scene', () => {
    const { scene, systemScene, groupOf } = setup();
    const ship = new Group();

    systemScene.attachShip(ship, 'umbral');
    expect(ship.parent).toBe(groupOf('umbral'));

    systemScene.attachShip(ship, undefined);
    expect(ship.parent).toBe(scene);
  });

  it('refuses a reference world it does not have', () => {
    const { systemScene } = setup();

    expect(() => {
      systemScene.setReference('narnia');
    }).toThrow(/narnia/);
  });
});

describe('a world outside any system (Hogar, Luna)', () => {
  it('stays at the origin, does not move the light and does not need the system', () => {
    const { systemScene, sun, groupOf } = setup({ system: undefined, start: 'hogar' });
    const light = sun.position.clone();

    systemScene.update(500);

    expect(groupOf('hogar').position.length()).toBe(0);
    expect(sun.position.distanceTo(light)).toBe(0);
    expect(systemScene.toSystem(new Vector3(1, 2, 3), 500, new Vector3()).toArray()).toEqual([
      1, 2, 3,
    ]);
  });
});
