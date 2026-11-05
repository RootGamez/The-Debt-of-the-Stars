// La Luna de Hogar por código (Fase 11): una bola gris azulada con cráteres y el fragmento de los Ausentes clavado en
// la cara que mira a Hogar. Cumple el contrato del .glb de antes: raíz con datos, COL_, INT_ y SPAWN_.
import { describe, expect, it } from 'vitest';
import { Box3, Vector3, type Object3D } from 'three';
import { leaveOut } from '../../../src/worlds/leaveOut';
import { buildWorld } from '../../../src/worlds/loadWorld';
import { isMesh } from '../../../src/worlds/markers';
import { direction, frameAt } from '../../../src/worlds/procedural/kit';
import { buildLuna } from '../../../src/worlds/procedural/luna';
import {
  FLAT_RADIUS,
  FRAGMENT_SITE,
  LUNA_RADIUS,
  distanceToFragment,
  lunaGround,
  lunaSurface,
} from '../../../src/worlds/procedural/lunaShape';
import { NOT_YET_ARRIVED } from '../../../src/game/homecoming';

const world = buildWorld('luna');
if (!world) throw new Error('La Luna debería construirse por código');

const toGltf = (v: Vector3): Vector3 => new Vector3(v.x, v.z, -v.y);
const positionOf = (object: Object3D): Vector3 => object.getWorldPosition(new Vector3());
const find = (name: string): Object3D | undefined => world.scene.getObjectByName(name);

describe('Luna shape', () => {
  it('stays within the relief of the old preset around its radius', () => {
    const margin = LUNA_RADIUS * 0.04 + 1e-6;
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = -180; lon < 180; lon += 20) {
        expect(Math.abs(lunaGround(direction(lat, lon)) - LUNA_RADIUS)).toBeLessThanOrEqual(margin);
      }
    }
  });

  it('is flat around the fragment so the ship and the player rest on level ground', () => {
    const site = direction(FRAGMENT_SITE.lat, FRAGMENT_SITE.lon);
    const centre = lunaGround(site);
    for (let a = 0; a < 360; a += 45) {
      const lat =
        FRAGMENT_SITE.lat +
        (Math.cos((a * Math.PI) / 180) * FLAT_RADIUS * 0.9) / LUNA_RADIUS / (Math.PI / 180);
      const d = direction(lat, FRAGMENT_SITE.lon);
      expect(distanceToFragment(d)).toBeLessThanOrEqual(FLAT_RADIUS);
      expect(lunaGround(d)).toBeCloseTo(centre, 6);
    }
  });

  it('is built deterministically', () => {
    const again = buildLuna();
    const marksOf = (scene: Object3D): string[] => {
      const names: string[] = [];
      scene.traverse((o) => {
        if (/^(INT_|SPAWN_|COL_)/.test(o.name)) names.push(o.name);
      });
      return names.sort();
    };
    expect(marksOf(again)).toEqual(marksOf(world.scene));
  });
});

describe('Luna world contract', () => {
  it('carries the data of its root', () => {
    expect(world.info.id).toBe('luna');
    expect(world.info.radius).toBe(35);
    expect(world.info.gravity).toBe(0.4);
    expect(world.info.clockRate).toBe(1);
  });

  it('has the fragment pieces the homecoming removes, with the collider inside the fragment', () => {
    const fragment = find('luna_Fragmento');
    expect(fragment).toBeDefined();
    expect(find('luna_Fragmento_Luz')).toBeDefined();
    const collider = find('COL_luna_Fragmento');
    expect(collider?.parent).toBe(fragment);
    expect(world.markers.colliders).toContain(collider);
  });

  it('has the terrain collider and a collider for the places', () => {
    expect(find('COL_luna_Terreno')).toBeDefined();
    expect(find('COL_luna_Lugares')).toBeDefined();
  });

  it('offers the fragment as the only source, of kind object', () => {
    expect(world.markers.interactions).toHaveLength(1);
    const [source] = world.markers.interactions;
    expect(source?.clueId).toBe('instituto.fragmento_luna');
    expect(source?.kind).toBe('objeto');
  });

  it('removes the fragment and its collider without leaving anything behind', () => {
    const without = leaveOut(buildWorld('luna') ?? world, NOT_YET_ARRIVED);
    expect(without.scene.getObjectByName('luna_Fragmento')).toBeUndefined();
    expect(without.scene.getObjectByName('luna_Fragmento_Luz')).toBeUndefined();
    expect(without.markers.colliders.some((m) => m.name === 'COL_luna_Fragmento')).toBe(false);
    expect(without.markers.colliders.some((m) => m.name === 'COL_luna_Terreno')).toBe(true);
  });
});

describe('Luna spawn and fragment', () => {
  const spawn = world.markers.spawns.get('SPAWN_Luna');
  const source = world.markers.interactions[0]?.object;

  it('puts the player on the ground, a few metres in front of the fragment', () => {
    expect(spawn).toBeDefined();
    if (!spawn || !source) return;
    const distance = positionOf(spawn).distanceTo(positionOf(source));
    expect(distance).toBeGreaterThan(4);
    expect(distance).toBeLessThan(9);
  });

  it('places the source within reach of the spawn, standing on the ground by the fragment', () => {
    if (!source) throw new Error('falta INT_fragmento_luna');
    const frame = frameAt(lunaSurface, FRAGMENT_SITE.lat, FRAGMENT_SITE.lon, {
      heading: FRAGMENT_SITE.heading,
      footprint: FRAGMENT_SITE.footprint,
      sink: FRAGMENT_SITE.sink,
    });
    const expected = toGltf(frame.point([0, -1.7, 1.5]));
    expect(positionOf(source).distanceTo(expected)).toBeLessThan(1e-3);
  });

  it('has a fragment that stands taller than a Ool and sticks out of the ground', () => {
    const fragment = find('luna_Fragmento');
    if (!fragment) throw new Error('falta luna_Fragmento');
    const box = new Box3().setFromObject(fragment);
    const size = box.getSize(new Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeGreaterThan(2.5);
  });
});

describe('Luna budget', () => {
  it('keeps the terrain and the details inside a reasonable triangle count', () => {
    let triangles = 0;
    world.scene.traverse((o) => {
      if (!isMesh(o) || o.name.startsWith('COL_')) return;
      const g = o.geometry;
      triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    });
    expect(triangles).toBeGreaterThan(3000);
    expect(triangles).toBeLessThan(40000);
  });
});
