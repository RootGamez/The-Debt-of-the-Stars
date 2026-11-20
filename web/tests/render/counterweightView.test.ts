import { Group, Object3D, Quaternion, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  createCounterweightView,
  RISE_SECONDS,
  type CounterweightModel,
} from '../../src/render/counterweightView';
import type { Hands, ModelUp } from '../../src/render/explorerView';
import type { Anchor } from '../../src/render/poseTween';

/** Unas manos de prueba: cuelgan lo que se les da de un punto y apuntan cómo va de pie. */
function fakeHands(): Hands & { at: Object3D; up: ModelUp | undefined } {
  const at = new Object3D();
  const hands = {
    at,
    up: undefined as ModelUp | undefined,
    hold(object: Object3D, up?: ModelUp) {
      at.add(object);
      hands.up = up;
    },
  };
  return hands;
}

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
  const hands = fakeHands();
  const model = fakeModel();
  const view = createCounterweightView(model, hands, {
    bench: anchor(lab, 5),
    cradle: anchor(cicatriz, 1),
    core: anchor(cicatriz, 11, 2),
  });
  return { scene, lab, cicatriz, hands, model, view };
}

describe('the Counterweight view', () => {
  it('sits on its bench and its rings turn', () => {
    const { lab, model, view } = setup();

    view.update('bench', 0.5);

    expect(model.object.parent).toBe(lab);
    expect(model.object.position.x).toBe(5);
    expect(model.object.visible).toBe(true);
    expect(model.rings[0]?.object.rotation.y).toBeCloseTo(1);
  });

  it('in your arms it goes to the explorer hands, standing (Y up), and in the ship it is not seen', () => {
    const { hands, model, view } = setup();

    view.update('held', 0);

    expect(model.object.parent).toBe(hands.at);
    expect(hands.up).toBe('y');

    view.update('stowed', 0);
    expect(model.object.visible).toBe(false);
  });

  it('rises slowly from the cradle into the core with the pulse, growing to the size of the hole', () => {
    const { cicatriz, model, view } = setup();
    view.update('held', 0);
    view.update('cradle', 0);
    expect(model.object.parent).toBe(cicatriz);
    expect(model.object.position.x).toBe(1);

    view.update('core', RISE_SECONDS / 2);
    expect(model.object.position.x).toBeGreaterThan(1);
    expect(model.object.position.x).toBeLessThan(11);

    view.update('core', RISE_SECONDS);
    expect(model.object.position.x).toBeCloseTo(11);
    expect(model.object.scale.x).toBeCloseTo(2);
  });

  it('is not shown where its world is missing', () => {
    const scene = new Scene();
    const lab = new Object3D();
    scene.add(lab);
    const model = fakeModel();
    const view = createCounterweightView(model, fakeHands(), { bench: anchor(lab, 5) });

    view.update('cradle', 0);

    expect(model.object.visible).toBe(false);
  });
});
