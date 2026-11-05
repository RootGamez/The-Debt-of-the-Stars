// Lo de dentro de un mundo solo se dibuja estando en él; su detalle de fuera, también de cerca.
import { describe, expect, it } from 'vitest';
import { Mesh, Object3D, Vector3 } from 'three';
import {
  createNearDetail,
  FAR_DETAIL_RADII,
  FAR_HIDDEN,
  NEAR_ONLY,
} from '../../src/render/nearDetail';
import type { WorldRuntime } from '../../src/worlds/worldRuntime';

const RADIUS = 80;

function marked(key: string): Mesh {
  const mesh = new Mesh();
  mesh.userData[key] = true;
  return mesh;
}

function runtimeWith(...objects: Object3D[]): WorldRuntime {
  const scene = new Object3D();
  scene.add(...objects);
  scene.updateMatrixWorld(true);
  return { world: { scene }, well: { radius: RADIUS } } as unknown as WorldRuntime;
}

const far = new Vector3(RADIUS * FAR_DETAIL_RADII + 1, 0, 0);
const close = new Vector3(RADIUS * FAR_DETAIL_RADII - 1, 0, 0);

describe('near detail', () => {
  it('shows the inside only while the player is in its world', () => {
    const inside = marked(NEAR_ONLY);
    const plain = new Mesh();
    const detail = createNearDetail(new Map([['cicatriz', runtimeWith(inside, plain)]]));

    detail.update('umbral', close);
    expect(inside.visible).toBe(false);
    expect(plain.visible).toBe(true);

    detail.update('cicatriz', far);
    expect(inside.visible).toBe(true);

    detail.update(undefined, close);
    expect(inside.visible).toBe(false);
  });

  it('shows the outside detail in its world or from close by, and hides it from afar', () => {
    const outside = marked(FAR_HIDDEN);
    const detail = createNearDetail(new Map([['cicatriz', runtimeWith(outside)]]));

    detail.update('umbral', far);
    expect(outside.visible).toBe(false);

    detail.update(undefined, close);
    expect(outside.visible).toBe(true);

    detail.update('cicatriz', far.clone().multiplyScalar(10));
    expect(outside.visible).toBe(true);
  });
});
