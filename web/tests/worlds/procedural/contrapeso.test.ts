// El Contrapeso por código (Fase 11): las mismas piezas que contrapeso.glb, de pie (Y arriba) y con sus tres anillos.
import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { buildCounterweight } from '../../../src/worlds/procedural/contrapeso';

describe('the Counterweight built in code', () => {
  const model = buildCounterweight();

  it('keeps the names the game and the old model used', () => {
    expect(model.object.children.map((c) => c.name).sort()).toEqual([
      'contrapeso_AnilloA',
      'contrapeso_AnilloB',
      'contrapeso_AnilloC',
      'contrapeso_Cuerpo',
      'contrapeso_Luz',
    ]);
  });

  it('turns three rings, each at its own pace', () => {
    expect(model.rings.map((r) => r.spin)).toEqual([0.45, -0.7, 0.25]);
    for (const r of model.rings) expect(r.object.userData.spin).toBe(r.spin);
  });

  it('stands upright, about 0.8 m tall, with its centre in the core', () => {
    const size = new Box3().setFromObject(model.object).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(0.7);
    expect(size.y).toBeLessThan(0.9);
    expect(size.y).toBeGreaterThan(size.z);
  });
});
