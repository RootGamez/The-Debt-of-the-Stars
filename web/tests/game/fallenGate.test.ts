// Los portales caídos (E4): reloj fuera de hora, se encienden poniéndolo en hora y se quedan así el resto del ciclo.
import { describe, expect, it } from 'vitest';
import { BUBBLE } from '../../src/data/bubble';
import {
  createFallenGate,
  fallenGateOpen,
  LABORATORY_GATE,
  TALLER_GATE,
} from '../../src/game/fallenGate';
import { TRACK_ERROR } from '../../src/game/teleporter';

const SEVEN = ['secuencia_fabrica'];

describe('a fallen gate', () => {
  it('is off by default and lets nobody through', () => {
    const gate = createFallenGate(TALLER_GATE);
    gate.step(1, { reference: 100, events: SEVEN });
    expect(gate.isLit).toBe(false);
    expect(gate.canCross('in')).toBe(false);
    expect(gate.canCross('out')).toBe(false);
    expect(gate.read(100)).toMatchObject({ target: 100, shown: 100 + TRACK_ERROR, matched: false });
  });

  it('lights up when its clock is on time and the event is on', () => {
    const gate = createFallenGate(TALLER_GATE);
    gate.turn('minutes', -3);
    gate.turn('seconds', -17);
    gate.step(1, { reference: 100, events: [] });
    expect(gate.isLit).toBe(false); // en hora, pero sin la secuencia de las 7:00
    gate.step(1, { reference: 101, events: SEVEN });
    expect(gate.isLit).toBe(true);
  });

  it('tolerates a couple of seconds but not more', () => {
    const near = createFallenGate(TALLER_GATE);
    near.turn('minutes', -3);
    near.turn('seconds', -15);
    near.step(1, { reference: 0, events: SEVEN });
    expect(near.isLit).toBe(true);
    const far = createFallenGate(TALLER_GATE);
    far.turn('minutes', -3);
    far.turn('seconds', -13);
    far.step(1, { reference: 0, events: SEVEN });
    expect(far.isLit).toBe(false);
  });

  it('works both ways once lit', () => {
    const gate = createFallenGate(TALLER_GATE);
    gate.turn('seconds', -TRACK_ERROR);
    gate.step(1, { reference: 0, events: SEVEN });
    expect(gate.canCross('in')).toBe(true);
    expect(gate.canCross('out')).toBe(true);
    expect(fallenGateOpen('pista', [gate])).toBe(true);
    expect(fallenGateOpen('otra', [gate])).toBe(false);
  });

  it('stays lit for the rest of the cycle, even after the event or a wheel turn', () => {
    const gate = createFallenGate(TALLER_GATE);
    gate.turn('seconds', -TRACK_ERROR);
    gate.step(1, { reference: 0, events: SEVEN });
    gate.turn('minutes', 5);
    gate.step(2, { reference: 50, events: [] });
    gate.step(3, { reference: 60, events: [] });
    expect(gate.isLit).toBe(true);
    expect(gate.litSeconds).toBe(5);
  });

  it('goes off and out of time again when a new cycle starts', () => {
    const gate = createFallenGate(TALLER_GATE);
    gate.turn('seconds', -TRACK_ERROR);
    gate.step(1, { reference: 0, events: SEVEN });
    gate.reset();
    expect(gate.isLit).toBe(false);
    expect(gate.litSeconds).toBe(0);
    expect(gate.read(0).matched).toBe(false);
    expect(gate.canCross('in')).toBe(false);
  });

  it('the Laboratory gate runs its clock x5 and needs no event', () => {
    expect(LABORATORY_GATE.rate).toBe(BUBBLE.bench);
    const gate = createFallenGate(LABORATORY_GATE);
    // A los 60 s de fuera, dentro son 300 s; el reloj va 415 s adelantado.
    expect(gate.read(60)).toMatchObject({ target: 300, shown: 715, matched: false });
    gate.turn('minutes', -6);
    gate.turn('seconds', -55);
    expect(gate.read(60)).toMatchObject({ target: 300, shown: 300, matched: true });
    gate.step(1, { reference: 60 });
    expect(gate.isLit).toBe(true);
    expect(fallenGateOpen('nudo', [gate])).toBe(true);
  });

  it('keeps the two gates independent', () => {
    const taller = createFallenGate(TALLER_GATE);
    const lab = createFallenGate(LABORATORY_GATE);
    lab.turn('seconds', -415);
    lab.step(1, { reference: 0 });
    taller.step(1, { reference: 0, events: SEVEN });
    expect(fallenGateOpen('nudo', [taller, lab])).toBe(true);
    expect(fallenGateOpen('pista', [taller, lab])).toBe(false);
  });
});
