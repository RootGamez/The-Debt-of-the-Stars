import { describe, expect, it } from 'vitest';
import {
  DAMAGE_FROM,
  coreTide,
  edgeTide,
  seedTide,
  shellTide,
  speedFactor,
  TideStrain,
} from '../../src/physics/tides';

describe('the tide at the Edge of Cicatriz', () => {
  it('grows as you get closer to the Edge', () => {
    expect(edgeTide(30, 100)).toBeLessThan(edgeTide(10, 100));
    expect(edgeTide(10, 100)).toBeLessThan(edgeTide(0, 100));
  });

  it('is nothing far from the Edge', () => {
    expect(edgeTide(80, 850)).toBe(0);
  });

  it('is bearable at the start of the cycle, even at the very Edge', () => {
    expect(edgeTide(0, 0)).toBeLessThan(DAMAGE_FROM);
  });

  it('grows along the cycle and becomes deadly near 13:30, when the black hole is born', () => {
    expect(edgeTide(0, 540)).toBeGreaterThan(DAMAGE_FROM);
    expect(edgeTide(0, 810)).toBeGreaterThan(edgeTide(0, 540));
    expect(edgeTide(0, 900)).toBeGreaterThan(edgeTide(0, 810));
  });

  it('survives nonsense', () => {
    expect(edgeTide(Number.NaN, 100)).toBe(0);
    expect(edgeTide(0, Number.NaN)).toBeGreaterThanOrEqual(0);
  });
});

describe('the tide of the micro black hole, inside Cicatriz', () => {
  it('is felt but bearable on the ring of the Engine Room (12 m) until the end of the cycle', () => {
    expect(coreTide(12, 0)).toBeGreaterThan(0.12);
    expect(coreTide(12, 0)).toBeLessThan(DAMAGE_FROM);
    expect(coreTide(10.5, 810)).toBeLessThan(DAMAGE_FROM);
  });

  it('grows toward the center and along the cycle', () => {
    expect(coreTide(5, 0)).toBeGreaterThan(coreTide(12, 0));
    expect(coreTide(12, 850)).toBeGreaterThan(coreTide(12, 100));
    expect(coreTide(4, 300)).toBeGreaterThan(DAMAGE_FROM);
  });

  it('is nothing on the inner face of the crust', () => {
    expect(coreTide(60, 900)).toBe(0);
  });

  it('survives nonsense', () => {
    expect(coreTide(Number.NaN, 0)).toBe(0);
  });
});

describe('the tide of the seed, inside the Nudo', () => {
  it('is nothing when walking or jumping normally on the inner face', () => {
    expect(seedTide(0)).toBe(0);
    expect(seedTide(3)).toBe(0);
  });

  it('pulls harder the higher you get toward the center', () => {
    expect(seedTide(6)).toBeGreaterThan(0);
    expect(seedTide(9)).toBeGreaterThan(seedTide(6));
    expect(seedTide(15)).toBeGreaterThan(DAMAGE_FROM);
  });

  it('stays bounded', () => {
    expect(seedTide(1000)).toBeLessThanOrEqual(1.5);
  });
});

describe('the tide on the shell of the Nudo', () => {
  it('is felt while standing on it, but never enough to hurt (you have to land there)', () => {
    const onShell = shellTide(25, 25);

    expect(onShell).toBeGreaterThan(0);
    expect(onShell).toBeLessThan(DAMAGE_FROM);
  });

  it('fades away with the distance', () => {
    expect(shellTide(40, 25)).toBeLessThan(shellTide(26, 25));
    expect(shellTide(200, 25)).toBe(0);
  });
});

describe('moving against the tide', () => {
  it('slows you down as the tide grows, without ever stopping you', () => {
    expect(speedFactor(0)).toBe(1);
    expect(speedFactor(0.5)).toBeLessThan(1);
    expect(speedFactor(5)).toBeGreaterThan(0.2);
    expect(speedFactor(5)).toBe(speedFactor(1));
  });
});

describe('the strain of the tide', () => {
  function expose(strain: TideStrain, tide: number, seconds: number): boolean {
    let lethal = false;
    for (let t = 0; t < seconds; t += 0.1) lethal = strain.update(tide, 0.1) || lethal;
    return lethal;
  }

  it('does not build up below the damage threshold', () => {
    const strain = new TideStrain();

    expect(expose(strain, DAMAGE_FROM - 0.05, 60)).toBe(false);
    expect(strain.value).toBe(0);
  });

  it('builds up above it and kills after a while: faster the stronger the tide', () => {
    const strong = new TideStrain();
    const mild = new TideStrain();

    expose(strong, 1, 2);
    expose(mild, 0.7, 2);

    expect(strong.value).toBeGreaterThan(mild.value);
    expect(expose(new TideStrain(), 1, 4)).toBe(true);
    expect(expose(new TideStrain(), 1, 2)).toBe(false);
  });

  it('wears off when you get away from it', () => {
    const strain = new TideStrain();
    expose(strain, 1, 2);
    const before = strain.value;

    expose(strain, 0, 1);

    expect(strain.value).toBeLessThan(before);
    expose(strain, 0, 30);
    expect(strain.value).toBe(0);
  });

  it('starts from zero again with a new cycle', () => {
    const strain = new TideStrain();
    expose(strain, 1, 2);

    strain.reset();

    expect(strain.value).toBe(0);
  });

  it('ignores a step that is not a number', () => {
    const strain = new TideStrain();

    strain.update(1, Number.NaN);
    strain.update(Number.NaN, 0.1);

    expect(strain.value).toBe(0);
  });
});
