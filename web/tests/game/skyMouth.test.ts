import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { SKY_MOUTH, createSkyMouth, crossesMouth, skyMouthCenter } from '../../src/game/skyMouth';

describe('the mouth that opens in the sky', () => {
  it('opens straight above the spot, at the set height over the world', () => {
    const center = skyMouthCenter(new Vector3(0, 0, 2), 70);

    expect(center.x).toBeCloseTo(0, 9);
    expect(center.z).toBeCloseTo(70 + SKY_MOUTH.altitude, 9);
  });

  it('is crossed only by the ship, when it flies into its ring', () => {
    const center = new Vector3(0, 0, 330);

    expect(crossesMouth(new Vector3(0, 0, 330), center)).toBe(true);
    expect(crossesMouth(new Vector3(SKY_MOUTH.crossRadius - 1, 0, 330), center)).toBe(true);
    expect(crossesMouth(new Vector3(SKY_MOUTH.crossRadius + 1, 0, 330), center)).toBe(false);
    expect(crossesMouth(new Vector3(0, 0, 0), center)).toBe(false);
  });

  it('is closed until a mouth is chosen, then remembers which one', () => {
    const mouth = createSkyMouth();

    expect(mouth.chosen).toBeUndefined();
    mouth.open('anochecer');
    expect(mouth.chosen).toBe('anochecer');
  });

  it('lets another mouth be chosen before crossing, and forgets it with the cycle', () => {
    const mouth = createSkyMouth();
    mouth.open('fragmentos');
    mouth.open('instituto');

    expect(mouth.chosen).toBe('instituto');
    mouth.reset();
    expect(mouth.chosen).toBeUndefined();
  });

  it('does not let it be crossed once it has been (the fade already took you)', () => {
    const mouth = createSkyMouth();
    mouth.open('anochecer');

    expect(mouth.cross()).toBe('anochecer');
    expect(mouth.cross()).toBeUndefined();
  });

  it('cannot be crossed when closed', () => {
    expect(createSkyMouth().cross()).toBeUndefined();
  });
});
