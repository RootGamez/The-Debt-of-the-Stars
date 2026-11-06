import { describe, expect, it } from 'vitest';
import { createPrologueGate, WORMHOLE, type PrologueFrame } from '../../src/game/prologue';

const SEATED_ON_THE_MOON: PrologueFrame = {
  world: WORMHOLE.world,
  seated: true,
  running: true,
  knowsFragment: true,
};

function wait(gate: ReturnType<typeof createPrologueGate>, frame: PrologueFrame, seconds: number) {
  let opened = 0;
  for (let i = 0; i < Math.round(seconds * 10); i++) if (gate.update(frame, 0.1)) opened++;
  return opened;
}

describe('the wormhole at the end of the prologue', () => {
  it('opens once, a moment after sitting back in the ship having examined the fragment', () => {
    const gate = createPrologueGate();

    expect(wait(gate, SEATED_ON_THE_MOON, WORMHOLE.after - 0.25)).toBe(0);
    expect(wait(gate, SEATED_ON_THE_MOON, 5)).toBe(1);
  });

  it('does not open just for flying around the Moon', () => {
    const gate = createPrologueGate();

    expect(wait(gate, { ...SEATED_ON_THE_MOON, knowsFragment: false }, 30)).toBe(0);
  });

  it('does not open on foot, at home nor while the game is paused or reading', () => {
    const gate = createPrologueGate();

    expect(wait(gate, { ...SEATED_ON_THE_MOON, seated: false }, 10)).toBe(0);
    expect(wait(gate, { ...SEATED_ON_THE_MOON, world: 'hogar' }, 10)).toBe(0);
    expect(wait(gate, { ...SEATED_ON_THE_MOON, running: false }, 10)).toBe(0);
  });

  it('starts counting again after standing up', () => {
    const gate = createPrologueGate();

    wait(gate, SEATED_ON_THE_MOON, WORMHOLE.after - 0.25);
    wait(gate, { ...SEATED_ON_THE_MOON, seated: false }, 1);

    expect(wait(gate, SEATED_ON_THE_MOON, WORMHOLE.after - 0.25)).toBe(0);
  });
});
