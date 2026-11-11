// El aviso de la L en la isla de la pieza: sale a pie cerca de ella con la luz apagada, se va a los pocos segundos,
// vuelve si sigue apagada y no sale más en cuanto se enciende allí.
import { describe, expect, it } from 'vitest';
import { LIGHT_TIP, LightTip, type LightTipFrame } from '../../src/game/lightTip';

const at = (overrides: Partial<LightTipFrame> = {}): LightTipFrame => ({
  task: 'isla',
  piloting: false,
  lightOn: false,
  meters: 20,
  dt: 0.1,
  ...overrides,
});

const run = (tip: LightTip, seconds: number, frame: Partial<LightTipFrame> = {}): boolean => {
  let shown = false;
  for (let t = 0; t < seconds - 1e-9; t += 0.1) shown = tip.update(at(frame));
  return shown;
};

describe('the tip that teaches the body light on the island', () => {
  it('shows on foot near the piece with the light off', () => {
    expect(new LightTip().update(at())).toBe(true);
  });

  it('does not show while flying, far away or during another task', () => {
    expect(new LightTip().update(at({ piloting: true }))).toBe(false);
    expect(new LightTip().update(at({ meters: LIGHT_TIP.near + 1 }))).toBe(false);
    expect(new LightTip().update(at({ meters: undefined }))).toBe(false);
    expect(new LightTip().update(at({ task: 'nave' }))).toBe(false);
  });

  it('goes away after a few seconds and comes back while the light stays off', () => {
    const tip = new LightTip();
    expect(run(tip, LIGHT_TIP.showFor - 1)).toBe(true);
    expect(run(tip, 2)).toBe(false);
    expect(run(tip, LIGHT_TIP.every - 3)).toBe(false);
    expect(run(tip, 4)).toBe(true);
  });

  it('does not count down in a pause', () => {
    const tip = new LightTip();
    run(tip, 1);
    expect(run(tip, 100, { dt: 0 })).toBe(true);
  });

  it('is learned once the light is switched on there and never shows again', () => {
    const tip = new LightTip();
    tip.update(at());
    expect(tip.update(at({ lightOn: true }))).toBe(false);
    expect(tip.done).toBe(true);
    expect(run(tip, 100)).toBe(false);
  });

  it('does not count a light switched on somewhere else', () => {
    const tip = new LightTip();
    tip.update(at({ task: 'nave', lightOn: true }));
    expect(tip.done).toBe(false);
    expect(tip.update(at())).toBe(true);
  });
});
