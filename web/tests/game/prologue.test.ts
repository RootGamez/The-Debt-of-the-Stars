import { describe, expect, it } from 'vitest';
import { createPrologueGate, WORMHOLE, type PrologueFrame } from '../../src/game/prologue';

const BY_THE_FRAGMENT: PrologueFrame = {
  world: WORMHOLE.world,
  onFoot: true,
  running: true,
  knowsFragment: true,
};

function wait(gate: ReturnType<typeof createPrologueGate>, frame: PrologueFrame, seconds: number) {
  let opened = 0;
  for (let i = 0; i < Math.round(seconds * 10); i++) if (gate.update(frame, 0.1)) opened++;
  return opened;
}

describe('the wormhole at the end of the prologue', () => {
  it('opens once, a moment after examining the fragment on the Moon', () => {
    const gate = createPrologueGate();

    expect(wait(gate, BY_THE_FRAGMENT, WORMHOLE.after - 0.5)).toBe(0);
    expect(wait(gate, BY_THE_FRAGMENT, 5)).toBe(1);
  });

  it('does not open just for walking on the Moon', () => {
    const gate = createPrologueGate();

    expect(wait(gate, { ...BY_THE_FRAGMENT, knowsFragment: false }, 30)).toBe(0);
  });

  it('does not open at home, from the ship nor while the game is paused or reading', () => {
    const gate = createPrologueGate();

    expect(wait(gate, { ...BY_THE_FRAGMENT, world: 'hogar' }, 10)).toBe(0);
    expect(wait(gate, { ...BY_THE_FRAGMENT, onFoot: false }, 10)).toBe(0);
    expect(wait(gate, { ...BY_THE_FRAGMENT, running: false }, 10)).toBe(0);
  });

  it('starts counting again after leaving the Moon', () => {
    const gate = createPrologueGate();

    wait(gate, BY_THE_FRAGMENT, WORMHOLE.after - 0.5);
    wait(gate, { ...BY_THE_FRAGMENT, onFoot: false }, 1);

    expect(wait(gate, BY_THE_FRAGMENT, WORMHOLE.after - 0.5)).toBe(0);
  });
});
