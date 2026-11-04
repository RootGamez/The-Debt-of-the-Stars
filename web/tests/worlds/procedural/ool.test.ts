// Los Ool por código (Fase 11G): el color y la luz siguen la edad (✅ Anthony 2026-11-03: de jóvenes, verde agua claro
// y muy luminosos; de mayores, más oscuros y con menos luz), y cada uno es un OOL_<quién> con su luz aparte.
import { describe, expect, it } from 'vitest';
import { Box3, MeshStandardMaterial, SRGBColorSpace, Vector3, type Mesh } from 'three';
import { buildOol, oolHeight, oolLook } from '../../../src/worlds/procedural/ool';

const material = new MeshStandardMaterial({ vertexColors: true });
const lightness = (age: number): number =>
  oolLook(age).body.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace).l;

describe('the colour of an Ool follows its age', () => {
  it('darkens the moss from the young to the old', () => {
    const ages = [0, 0.25, 0.5, 0.75, 1];
    const values = ages.map(lightness);
    for (let k = 1; k < values.length; k++) {
      expect(values[k]).toBeLessThan(values[k - 1] ?? Infinity);
    }
    expect(values[0]).toBeGreaterThan(0.6); // verde agua claro
    expect(values[4]).toBeLessThan(0.35);
  });

  it('gives less light the older they are: dimmer and with fewer dots', () => {
    const young = oolLook(0.05);
    const old = oolLook(0.95);
    expect(young.glowIntensity).toBeGreaterThan(old.glowIntensity * 3);
    expect(young.dots).toBeGreaterThan(old.dots);
  });

  it('keeps the young ones small and the old ones shaggy', () => {
    expect(oolLook(0).size).toBeLessThan(0.6);
    expect(oolLook(0.4).size).toBe(1);
    expect(oolLook(1).fibers).toBeGreaterThan(oolLook(0).fibers);
    expect(oolHeight(0.05)).toBeLessThan(oolHeight(0.6));
  });

  it('stays within its range for any age', () => {
    expect(oolLook(-3)).toEqual(oolLook(0));
    expect(oolLook(7)).toEqual(oolLook(1));
  });
});

describe('an Ool model', () => {
  const ool = buildOol(
    { id: 'maestra', age: 0.85, outfit: 'maestra', holding: 'libro' },
    { body: material },
  );
  const glow = ool.getObjectByName('OOL_maestra_Luz') as Mesh | undefined;

  it('is an OOL_ group with its light in a child the view can make throb', () => {
    expect(ool.name).toBe('OOL_maestra');
    expect(glow?.material).toBeInstanceOf(MeshStandardMaterial);
    expect((glow?.material as MeshStandardMaterial).emissiveIntensity).toBeCloseTo(
      oolLook(0.85).glowIntensity,
    );
    // Ningún otro hijo se llama OOL_: si no, contaría como otro personaje.
    const named = ool.children.filter((c) => c.name.startsWith('OOL_'));
    expect(named.map((c) => c.name)).toEqual(['OOL_maestra_Luz']);
  });

  it('stands on its feet, Y up, with its face towards −Z', () => {
    const box = new Box3().setFromObject(ool);
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(box.max.y).toBeGreaterThan(1.2);
    expect(box.max.y).toBeLessThan(1.9);
    // Los ojos (la luz no cuenta) y el libro están delante: el modelo sobresale más por −Z que por +Z.
    expect(-box.min.z).toBeGreaterThan(box.max.z);
  });

  it('is a small model', () => {
    const body = ool.getObjectByName('hogar_ool_maestra') as Mesh;
    const triangles = body.geometry.getAttribute('position').count / 3;
    expect(triangles).toBeLessThan(3000);
    expect(new Box3().setFromObject(ool).getSize(new Vector3()).x).toBeLessThan(1.4);
  });
});
