import { Group, Object3D, PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  createCounterweightView,
  type CounterweightModel,
} from '../../src/render/counterweightView';

function fakeModel(): CounterweightModel {
  const object = new Group();
  const ring = new Object3D();
  object.add(ring);
  return { object, rings: [{ object: ring, spin: 2 }] };
}

function setup() {
  const scene = new Scene();
  const bench = new Object3D();
  bench.position.set(5, 0, 0);
  scene.add(bench);
  const camera = new PerspectiveCamera();
  camera.position.set(0, 1.6, 0);
  const model = fakeModel();
  const view = createCounterweightView(model, scene);
  view.anchorTo(bench);
  return { scene, bench, camera, model, view };
}

describe('the Counterweight view', () => {
  it('sits on its anchor and its rings turn', () => {
    const { bench, camera, model, view } = setup();

    view.update('anchored', camera, 0.5);

    expect(model.object.parent).toBe(bench);
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

  it('goes back to its anchor, at its own size, after being carried', () => {
    const { bench, camera, model, view } = setup();
    view.update('held', camera, 0);

    view.update('anchored', camera, 0);

    expect(model.object.parent).toBe(bench);
    expect(model.object.position).toEqual(new Vector3());
    expect(model.object.scale.x).toBe(1);
  });
});
