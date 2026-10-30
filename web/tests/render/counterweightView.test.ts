import { Group, Object3D, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  createCounterweightView,
  RISE_SECONDS,
  type CounterweightModel,
} from '../../src/render/counterweightView';
import type { Anchor } from '../../src/render/poseTween';

function fakeModel(): CounterweightModel {
  const object = new Group();
  const ring = new Object3D();
  object.add(ring);
  return { object, rings: [{ object: ring, spin: 2 }] };
}

function anchor(parent: Object3D, x: number, scale = 1): Anchor {
  return { parent, pose: { position: new Vector3(x, 0, 0), quaternion: new Quaternion(), scale } };
}

function setup() {
  const scene = new Scene();
  const lab = new Object3D();
  const cicatriz = new Object3D();
  scene.add(lab, cicatriz);
  const camera = new PerspectiveCamera();
  camera.position.set(0, 1.6, 0);
  const model = fakeModel();
  const view = createCounterweightView(model, scene, {
    bench: anchor(lab, 5),
    cradle: anchor(cicatriz, 1),
    core: anchor(cicatriz, 11, 2),
  });
  return { scene, lab, cicatriz, camera, model, view };
}

describe('the Counterweight view', () => {
  it('sits on its bench and its rings turn', () => {
    const { lab, camera, model, view } = setup();

    view.update('bench', camera, 0.5);

    expect(model.object.parent).toBe(lab);
    expect(model.object.position.x).toBe(5);
    expect(model.object.visible).toBe(true);
    expect(model.rings[0]?.object.rotation.y).toBeCloseTo(1);
  });

  it('in your arms it hangs low in front of the eyes, and in the ship it is not seen', () => {
    const { scene, camera, model, view } = setup();

    view.update('held', camera, 0);
    const offset = model.object.position.clone().sub(camera.position);

    expect(model.object.parent).toBe(scene);
    expect(offset.y).toBeLessThan(0); // abajo
    expect(offset.z).toBeLessThan(0); // delante (la cámara mira a -Z)
    expect(offset.length()).toBeLessThan(1.2);

    view.update('stowed', camera, 0);
    expect(model.object.visible).toBe(false);
  });

  it('rises slowly from the cradle into the core with the pulse, growing to the size of the hole', () => {
    const { cicatriz, camera, model, view } = setup();
    view.update('held', camera, 0);
    view.update('cradle', camera, 0);
    expect(model.object.parent).toBe(cicatriz);
    expect(model.object.position.x).toBe(1);

    view.update('core', camera, RISE_SECONDS / 2);
    expect(model.object.position.x).toBeGreaterThan(1);
    expect(model.object.position.x).toBeLessThan(11);

    view.update('core', camera, RISE_SECONDS);
    expect(model.object.position.x).toBeCloseTo(11);
    expect(model.object.scale.x).toBeCloseTo(2);
  });

  it('is not shown where its world is missing', () => {
    const scene = new Scene();
    const lab = new Object3D();
    scene.add(lab);
    const model = fakeModel();
    const view = createCounterweightView(model, scene, { bench: anchor(lab, 5) });

    view.update('cradle', new PerspectiveCamera(), 0);

    expect(model.object.visible).toBe(false);
  });
});
