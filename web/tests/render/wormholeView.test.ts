import { Group, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { WORMHOLE_SEQUENCE } from '../../src/game/wormhole';
import { createWormholeView } from '../../src/render/wormholeView';

const EYE = new Vector3(0, 0, 10);

/** Una escena con un mundo (la Luna) desplazado y girado, como cuando el marco de la escena es otro. */
function moonInScene() {
  const scene = new Scene();
  const moon = new Group();
  moon.position.set(100, 0, 0);
  moon.rotation.z = Math.PI / 2;
  scene.add(moon);
  scene.updateMatrixWorld();
  return { scene, moon };
}

describe('the wormhole view', () => {
  it('is nowhere and bends nothing until it opens', () => {
    const { scene } = moonInScene();
    const view = createWormholeView();

    view.update(1, EYE);

    expect(view.active).toBe(false);
    expect(view.progress).toBe(0);
    expect(view.stretch).toBe(0);
    expect(view.lens()).toBeUndefined();
    expect(scene.getObjectByName('Gusano')).toBeUndefined();
  });

  it('hangs from the Moon where it is told and ends bending the stars there', () => {
    const { scene, moon } = moonInScene();
    const view = createWormholeView();
    const center = new Vector3(5, 2, 0);

    view.start(moon, center);
    view.update(0.1, EYE);
    expect(view.active).toBe(true);
    expect(view.lens()).toBeUndefined(); // aún no pesa

    view.update(WORMHOLE_SEQUENCE.seconds, EYE);
    const root = scene.getObjectByName('Gusano');
    expect(root?.parent).toBe(moon);
    expect(root?.visible).toBe(true);
    expect(root?.position.toArray()).toEqual(center.toArray());
    expect(root?.scale.x).toBeCloseTo(WORMHOLE_SEQUENCE.ringRadius);
    expect(view.progress).toBe(1);
    expect(view.stretch).toBeCloseTo(WORMHOLE_SEQUENCE.stretch);
    expect(view.lens()?.radius).toBe(WORMHOLE_SEQUENCE.lensRadius);
    // La lente lo ve en la escena: la Luna girada 90° lleva (5, 2, 0) a (−2, 5, 0), más su sitio.
    const lens = view.lens()?.position;
    expect(lens?.x).toBeCloseTo(98);
    expect(lens?.y).toBeCloseTo(5);
    expect(lens?.z).toBeCloseTo(0);
  });

  it('does not restart once open and leaves the Moon when disposed', () => {
    const { scene, moon } = moonInScene();
    const view = createWormholeView();
    view.start(moon, new Vector3(1, 0, 0));
    view.update(1, EYE);

    view.start(scene, new Vector3(9, 9, 9));
    view.update(0, EYE);

    expect(scene.getObjectByName('Gusano')?.position.x).toBe(1);
    expect(scene.getObjectByName('Gusano')?.parent).toBe(moon);
    expect(view.progress).toBeGreaterThan(0);
    view.dispose();
    expect(scene.getObjectByName('Gusano')).toBeUndefined();
  });
});
