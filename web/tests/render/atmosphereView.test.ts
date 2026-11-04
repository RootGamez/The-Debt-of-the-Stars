import { Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ATMOSPHERES } from '../../src/data/atmospheres';
import { createAtmosphereView } from '../../src/render/atmosphereView';

const air = ATMOSPHERES.hogar;
if (!air) throw new Error('Hogar tiene aire');
const center = new Vector3(3000, 0, 0);
const star = new Vector3(0, 0, 0);

function skyOf(scene: Scene) {
  return scene.getObjectByName('Cielo');
}

describe('the sky of a world with air', () => {
  it('covers the stars on the ground, around whoever looks, with the star in its glow', () => {
    const scene = new Scene();
    const view = createAtmosphereView(scene);
    const eye = new Vector3(3000, 121, 0);

    view.update({ eye, world: { center, radius: 120, air }, star });

    expect(view.density).toBe(1);
    expect(skyOf(scene)?.visible).toBe(true);
    expect(skyOf(scene)?.position.equals(eye)).toBe(true);
    expect(skyOf(scene)?.renderOrder).toBeGreaterThan(-1); // después de las estrellas
    expect(skyOf(scene)?.renderOrder).toBeLessThan(0); // antes que todo lo demás
  });

  it('is not drawn high above the ground nor where there is no air', () => {
    const scene = new Scene();
    const view = createAtmosphereView(scene);

    view.update({ eye: new Vector3(3000, 500, 0), world: { center, radius: 120, air }, star });
    expect(skyOf(scene)?.visible).toBe(false);

    view.update({ eye: new Vector3(3000, 121, 0), world: undefined, star });
    expect(view.density).toBe(0);
    expect(skyOf(scene)?.visible).toBe(false);
  });

  it('lets the stars through a thin air: Umbral only covers part of them', () => {
    const thin = ATMOSPHERES.umbral;
    if (!thin) throw new Error('Umbral tiene aire (Fase 11)');
    const scene = new Scene();
    const view = createAtmosphereView(scene);

    view.update({ eye: new Vector3(3000, 91, 0), world: { center, radius: 90, air: thin }, star });

    expect(view.density).toBe(1);
    expect(view.coverage).toBeGreaterThan(0.4);
    expect(view.coverage).toBeLessThan(1);
  });

  it('covers almost everything on Hogar, with a sky like the Archivo (Phase 11G)', () => {
    const scene = new Scene();
    const view = createAtmosphereView(scene);

    view.update({ eye: new Vector3(3000, 121, 0), world: { center, radius: 120, air }, star });

    expect(view.coverage).toBeCloseTo(air.opacity ?? 1);
    expect(view.coverage).toBeGreaterThan(0.9);
  });

  it('leaves the scene clean when disposed', () => {
    const scene = new Scene();
    const view = createAtmosphereView(scene);

    view.dispose();

    expect(skyOf(scene)).toBeUndefined();
  });
});
