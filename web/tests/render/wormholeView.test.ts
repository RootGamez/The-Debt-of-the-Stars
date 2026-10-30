import { Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { WORMHOLE_SEQUENCE } from '../../src/game/wormhole';
import { createWormholeView } from '../../src/render/wormholeView';

const EYE = new Vector3(0, 0, 10);

describe('the wormhole view', () => {
  it('stays hidden and bends nothing until it opens', () => {
    const scene = new Scene();
    const view = createWormholeView(scene);

    view.update(1, EYE);

    expect(view.active).toBe(false);
    expect(view.progress).toBe(0);
    expect(view.stretch).toBe(0);
    expect(view.lens()).toBeUndefined();
    expect(scene.getObjectByName('Gusano')?.visible).toBe(false);
  });

  it('opens where it is told, facing the viewer, and ends bending the stars', () => {
    const scene = new Scene();
    const view = createWormholeView(scene);
    const center = new Vector3(5, 2, 0);

    view.start(center);
    view.update(0.1, EYE);
    expect(view.active).toBe(true);
    expect(view.lens()).toBeUndefined(); // aún no pesa

    view.update(WORMHOLE_SEQUENCE.seconds, EYE);
    const root = scene.getObjectByName('Gusano');
    expect(root?.visible).toBe(true);
    expect(root?.position.toArray()).toEqual(center.toArray());
    expect(root?.scale.x).toBeCloseTo(WORMHOLE_SEQUENCE.ringRadius);
    expect(view.progress).toBe(1);
    expect(view.stretch).toBeCloseTo(WORMHOLE_SEQUENCE.stretch);
    expect(view.lens()?.radius).toBe(WORMHOLE_SEQUENCE.lensRadius);
    expect(view.lens()?.position.toArray()).toEqual(center.toArray());
  });

  it('does not restart once open and leaves the scene when disposed', () => {
    const scene = new Scene();
    const view = createWormholeView(scene);
    view.start(new Vector3(1, 0, 0));
    view.update(1, EYE);

    view.start(new Vector3(9, 9, 9));
    view.update(0, EYE);

    expect(scene.getObjectByName('Gusano')?.position.x).toBe(1);
    expect(view.progress).toBeGreaterThan(0);
    view.dispose();
    expect(scene.getObjectByName('Gusano')).toBeUndefined();
  });
});
