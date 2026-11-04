// Las nubes del Taller (Fase 11F): bajo la capa matan, salvo en la sala del centro.
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { sunkInGas } from '../../src/physics/gas';

const center = new Vector3();
const gas = { lethal: 74, safe: 22 };
const at = (r: number): Vector3 => new Vector3(0, 0, r);

describe('sinking into the gas', () => {
  it('kills under the layer and not above it', () => {
    expect(sunkInGas(at(90), center, gas)).toBe(false);
    expect(sunkInGas(at(73), center, gas)).toBe(true);
    expect(sunkInGas(at(30), center, gas)).toBe(true);
  });

  it('spares the room in the middle and worlds without gas', () => {
    expect(sunkInGas(at(8), center, gas)).toBe(false);
    expect(sunkInGas(at(30), center, undefined)).toBe(false);
  });
});
