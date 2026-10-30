import { Group, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createOolView } from '../../src/render/oolView';

/** Un Ool en el origen de un mundo, mirando a −Z (su frente en el modelo), con su malla de luz. */
function oneOol() {
  const world = new Group();
  const object = new Object3D();
  const glow = new Mesh(
    new SphereGeometry(0.1),
    new MeshStandardMaterial({ emissiveIntensity: 2 }),
  );
  object.add(glow);
  world.add(object);
  world.updateMatrixWorld();
  return { world, object, glow };
}

function run(view: ReturnType<typeof createOolView>, viewer: Vector3 | undefined, seconds: number) {
  for (let t = 0; t < seconds; t += 0.1) view.update(t, 0.1, viewer);
}

describe('the Ool of home', () => {
  it('turn toward you when you come near, but not all the way round', () => {
    const { object, glow } = oneOol();
    const view = createOolView([{ id: 'maestra', object, glow }], false);

    run(view, new Vector3(-2, 0, 0), 3); // a su derecha (su frente es −Z)

    expect(view.snapshot().maestra).toBeGreaterThan(0.9);
    run(view, new Vector3(0, 0, 3), 3); // justo detrás
    expect(Math.abs(view.snapshot().maestra ?? 0)).toBeLessThanOrEqual(1.1 + 1e-9);
  });

  it('go back to what they were doing when you walk away or leave', () => {
    const { object, glow } = oneOol();
    const view = createOolView([{ id: 'cria', object, glow }], false);

    run(view, new Vector3(-2, 0, 0), 3);
    run(view, new Vector3(-20, 0, 0), 4);
    expect(Math.abs(view.snapshot().cria ?? 1)).toBeLessThan(0.05);
    run(view, new Vector3(-2, 0, 0), 3);
    run(view, undefined, 4);
    expect(Math.abs(view.snapshot().cria ?? 1)).toBeLessThan(0.05);
  });

  it('breathe and their filaments pulse, each with its own light', () => {
    const { object, glow } = oneOol();
    const shared = glow.material;
    const view = createOolView([{ id: 'tecnico', object, glow }], false);

    expect(glow.material).not.toBe(shared);
    const heights = new Set<number>();
    const lights = new Set<number>();
    for (let t = 0; t < 4; t += 0.5) {
      view.update(t, 0.1, undefined);
      heights.add(Number(object.scale.y.toFixed(4)));
      lights.add(Number(glow.material.emissiveIntensity.toFixed(4)));
    }
    expect(heights.size).toBeGreaterThan(2);
    expect(lights.size).toBeGreaterThan(2);
  });

  it('keep still with reduced motion, though they still look at you', () => {
    const { object, glow } = oneOol();
    const view = createOolView([{ id: 'pescador', object, glow }], true);

    run(view, new Vector3(-2, 0, 0), 3);

    expect(object.scale.y).toBe(1);
    expect(glow.material.emissiveIntensity).toBe(2);
    expect(view.snapshot().pescador).toBeGreaterThan(0.9);
  });
});
