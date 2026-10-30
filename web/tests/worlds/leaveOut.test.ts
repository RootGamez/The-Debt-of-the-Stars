import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D } from 'three';
import { leaveOut } from '../../src/worlds/leaveOut';
import type { LoadedWorld } from '../../src/worlds/loadWorld';
import { collectMarkers, readWorldInfo } from '../../src/worlds/markers';

function named<T extends Object3D>(object: T, name: string): T {
  object.name = name;
  return object;
}

function mesh(name: string): Mesh {
  return named(new Mesh(new BoxGeometry(), new MeshBasicMaterial()), name);
}

/** La Luna con su fragmento suelto: la colisión del fragmento cuelga de él. */
function moon(): LoadedWorld {
  const scene = new Group();
  const root = named(new Object3D(), 'luna');
  root.userData = { world_id: 'luna', radius: 35, gravity: 0.4, clock_rate: 1 };
  const fragment = mesh('luna_Fragmento');
  fragment.add(mesh('COL_luna_Fragmento'));
  root.add(mesh('luna_Terreno'), mesh('COL_luna_Terreno'), fragment, mesh('luna_Fragmento_Luz'));
  scene.add(root);
  return { scene, info: readWorldInfo(scene, 'luna'), markers: collectMarkers(scene) };
}

describe('leaving pieces out of a world (the earlier home)', () => {
  it('takes the pieces out of the scene together with their collisions', () => {
    const world = moon();

    const without = leaveOut(world, ['luna_Fragmento', 'luna_Fragmento_Luz']);

    expect(without.scene.getObjectByName('luna_Fragmento')).toBeUndefined();
    expect(without.scene.getObjectByName('luna_Fragmento_Luz')).toBeUndefined();
    expect(without.markers.colliders.map((c) => c.name)).toEqual(['COL_luna_Terreno']);
    expect(world.markers.colliders).toHaveLength(2); // los marcadores de antes no cambian
  });

  it('ignores pieces the world does not have', () => {
    const world = moon();

    expect(leaveOut(world, ['hogar_FragmentosVitrinas'])).toBe(world);
    expect(leaveOut(world, [])).toBe(world);
  });
});
