import { describe, expect, it } from 'vitest';
import { Guide, GUIDE_STEPS, guideText, LANDING_FROM, type GuideState } from '../../src/game/guide';

const START: GuideState = {
  walked: 0,
  hasMission: false,
  knowsSomething: false,
  registryOpened: false,
  piloting: false,
  targetingMoon: false,
  moonDistance: undefined,
  onMoon: false,
  sawFragment: false,
};

describe('the guide of the prologue', () => {
  it('teaches one thing at a time, in the order the prologue needs them', () => {
    const guide = new Guide();
    let s = START;

    expect(guide.current(s)).toBe('andar');
    s = { ...s, walked: 5 };
    expect(guide.current(s)).toBe('directora');
    s = { ...s, hasMission: true, knowsSomething: true };
    expect(guide.current(s)).toBe('registro');
    s = { ...s, registryOpened: true };
    expect(guide.current(s)).toBe('hangar');
    s = { ...s, piloting: true, moonDistance: 600 };
    expect(guide.current(s)).toBe('apuntar');
    s = { ...s, targetingMoon: true, moonDistance: LANDING_FROM - 10 };
    expect(guide.current(s)).toBe('posarse');
    s = { ...s, piloting: false, onMoon: true };
    expect(guide.current(s)).toBe('fragmento');
    s = { ...s, sawFragment: true };
    expect(guide.current(s)).toBeUndefined();
    expect(guide.done).toEqual(GUIDE_STEPS);
  });

  it('never shows again what is already learned, even if the state goes back', () => {
    const guide = new Guide();
    guide.current({ ...START, walked: 5, hasMission: true });

    expect(guide.current({ ...START, walked: 0 })).toBeUndefined();
  });

  it('skips what the player did ahead of time', () => {
    const guide = new Guide();

    // Fue al hangar sin la misión: no hay nada que enseñar sobre la Directora hasta tenerla.
    expect(guide.current({ ...START, walked: 10, piloting: true })).toBe('directora');
    // Ya en la Luna sin haber apuntado: apuntar y posarse se dan por aprendidos.
    expect(guide.current({ ...START, walked: 10, hasMission: true, onMoon: true })).toBe(
      'fragmento',
    );
  });

  it('has a text for every step, for keys and for touch', () => {
    for (const step of GUIDE_STEPS) {
      expect(guideText(step, false).length).toBeGreaterThan(10);
      expect(guideText(step, true)).not.toEqual(guideText(step, false));
    }
  });
});
