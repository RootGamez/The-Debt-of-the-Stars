import { describe, expect, it } from 'vitest';
import { createPrologueGate, WORMHOLE, type PrologueFrame } from '../../src/game/prologue';

const ON_THE_MOON: PrologueFrame = { world: WORMHOLE.world, onFoot: true, running: true };

function wait(gate: ReturnType<typeof createPrologueGate>, frame: PrologueFrame, seconds: number) {
  let opened = 0;
  for (let i = 0; i < Math.round(seconds * 10); i++) if (gate.update(frame, 0.1)) opened++;
  return opened;
}

describe('the wormhole at the end of the prologue (provisional)', () => {
  it('opens once after standing on the Moon for a moment', () => {
    const gate = createPrologueGate();

    expect(wait(gate, ON_THE_MOON, WORMHOLE.after - 0.5)).toBe(0);
    expect(wait(gate, ON_THE_MOON, 5)).toBe(1);
  });

  it('does not open at home, from the ship nor while the game is paused or reading', () => {
    const gate = createPrologueGate();

    expect(wait(gate, { ...ON_THE_MOON, world: 'hogar' }, 10)).toBe(0);
    expect(wait(gate, { ...ON_THE_MOON, onFoot: false }, 10)).toBe(0);
    expect(wait(gate, { ...ON_THE_MOON, running: false }, 10)).toBe(0);
  });

  it('starts counting again after leaving the Moon', () => {
    const gate = createPrologueGate();

    wait(gate, ON_THE_MOON, WORMHOLE.after - 0.5);
    wait(gate, { ...ON_THE_MOON, onFoot: false }, 1);

    expect(wait(gate, ON_THE_MOON, WORMHOLE.after - 0.5)).toBe(0);
  });
});
