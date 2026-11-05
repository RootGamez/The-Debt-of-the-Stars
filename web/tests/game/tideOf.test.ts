// La marea del núcleo de Cicatriz: mata cuando el agujero crece, pero con el Contrapeso el agujero queda sujeto y
// su marea es la del horizonte estable (se nota, no mata; Fase 10D), así que la nave puede bajar a él.
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { tideOf } from '../../src/game/tideEffects';
import { DAMAGE_FROM } from '../../src/physics/tides';
import { horizonTide } from '../../src/system/absorption';
import type { WorldRuntime } from '../../src/worlds/worldRuntime';

const cicatriz = {
  id: 'cicatriz',
  well: {
    center: new Vector3(),
    radius: 80,
    strength: 12,
    range: 160,
    innerRadius: 60,
    cavityLimit: 61,
  },
  world: { info: { cavityTide: 'nucleo' } },
} as unknown as WorldRuntime;

const SOURCES = { edge: undefined, palco: undefined };
const nearCore = new Vector3(0, 8, 0);

function frame(stableHole: boolean, horizon = 0) {
  return {
    world: cicatriz,
    position: nearCore,
    loopTime: 880,
    absorption: 0,
    horizon,
    stableHole,
    running: true,
    piloting: true,
  };
}

describe('the tide of the core of Cicatriz', () => {
  it('is lethal next to the growing hole', () => {
    expect(tideOf(frame(false), SOURCES)).toBeGreaterThan(DAMAGE_FROM);
  });

  it('is only the tide of the stable horizon once the Counterweight holds the hole', () => {
    expect(tideOf(frame(true, 0.9), SOURCES)).toBe(horizonTide(0.9));
    expect(tideOf(frame(true, 0.9), SOURCES)).toBeLessThanOrEqual(DAMAGE_FROM);
  });
});
