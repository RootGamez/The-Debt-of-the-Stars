// La capa de juego de los portales caídos (E4): une los relojes fuera de hora (fallenGate.ts) con los anillos PASO_
// que tienen `cerradura`. Apagado no deja pasar; puesto en hora (y con su evento, si lo pide) se enciende y deja pasar
// en los dos sentidos el resto del ciclo.
import { describe, expect, it } from 'vitest';
import { LABORATORY_GATE, TALLER_GATE } from '../../src/game/fallenGate';
import {
  createFallenGatePlay,
  fallenGateLook,
  GATE_BLINK,
  GATE_OPENING_SECONDS,
} from '../../src/game/fallenGatePlay';

function setup(reference = { nudo: 60, taller: 30 }) {
  const clocks = { ...reference };
  const play = createFallenGatePlay([
    { spec: LABORATORY_GATE, reference: () => clocks.nudo },
    { spec: TALLER_GATE, reference: () => clocks.taller },
  ]);
  return { play, clocks };
}

describe('the fallen gates in play', () => {
  it('owns only the rings whose lock belongs to a fallen gate', () => {
    const { play } = setup();
    expect(play.owns('nudo')).toBe(true);
    expect(play.owns('pista')).toBe(true);
    expect(play.owns('sala_cerrada')).toBe(false);
    expect(play.owns(undefined)).toBe(false);
    expect(play.isOpen('sala_cerrada')).toBeUndefined();
    expect(play.isOpen(undefined)).toBeUndefined();
  });

  it('keeps every fallen ring shut while its clock is out of time', () => {
    const { play } = setup();
    play.step(1, ['secuencia_fabrica']);
    expect(play.isOpen('nudo')).toBe(false);
    expect(play.isOpen('pista')).toBe(false);
    expect(play.lit('laboratorio')).toBe(false);
  });

  it('reads each gate against its own outside clock', () => {
    const { play, clocks } = setup();
    expect(play.reading('laboratorio')).toMatchObject({ target: 300, shown: 715, matched: false });
    clocks.nudo = 120;
    expect(play.reading('laboratorio')).toMatchObject({ target: 600, shown: 1015 });
    expect(play.reading('nada')).toBeUndefined();
  });

  it('lights a gate once its clock is put on time, and says which one just lit', () => {
    const { play } = setup();
    play.turn('laboratorio', 'minutes', -6);
    play.turn('laboratorio', 'seconds', -55);
    expect(play.step(0.5, [])).toEqual(['laboratorio']);
    expect(play.isOpen('nudo')).toBe(true);
    expect(play.isOpen('pista')).toBe(false);
    // Ya encendido no se anuncia otra vez.
    expect(play.step(0.5, [])).toEqual([]);
  });

  it('needs the event of the gate that asks for one (the Taller at 7:00)', () => {
    const { play } = setup();
    play.setOnTime('taller');
    expect(play.step(1, [])).toEqual([]);
    expect(play.step(1, ['secuencia_fabrica'])).toEqual(['taller']);
    expect(play.isOpen('pista')).toBe(true);
  });

  it('stays open both ways for the rest of the cycle and shuts again with a new one', () => {
    const { play } = setup();
    play.setOnTime('laboratorio');
    play.step(1, []);
    play.turn('laboratorio', 'minutes', 9);
    play.step(10, []);
    expect(play.isOpen('nudo')).toBe(true);
    play.reset();
    expect(play.isOpen('nudo')).toBe(false);
    expect(play.reading('laboratorio')?.matched).toBe(false);
  });

  it('ignores turns and set-on-time for a gate it does not know', () => {
    const { play } = setup();
    expect(() => {
      play.turn('nada', 'seconds', 1);
    }).not.toThrow();
    expect(play.setOnTime('nada')).toBe(false);
  });

  it('tells the debug panel how each gate stands', () => {
    const { play } = setup();
    play.setOnTime('laboratorio');
    play.step(2, []);
    play.step(1, []);
    expect(play.snapshot()).toEqual([
      { id: 'laboratorio', lock: 'nudo', lit: true, litSeconds: 1, matched: true },
      { id: 'taller', lock: 'pista', lit: false, litSeconds: 0, matched: false },
    ]);
  });

  it('gives the look of each ring by its lock', () => {
    const { play } = setup();
    expect(play.look('nudo', 0)).toEqual(fallenGateLook(false, 0, 0));
    expect(play.look('otra', 0)).toBeUndefined();
  });
});

describe('the look of a fallen ring', () => {
  it('is a dead ring with a clock that blinks while it is off', () => {
    const on = fallenGateLook(false, 0, 0);
    const off = fallenGateLook(false, 0, GATE_BLINK.on + 0.01);
    expect(on).toEqual({ lit: false, membrane: 0, blink: true });
    expect(off).toEqual({ lit: false, membrane: 0, blink: false });
    // Vuelve a parpadear con cada periodo.
    expect(fallenGateLook(false, 0, GATE_BLINK.period + 0.01).blink).toBe(true);
  });

  it('opens its membrane little by little once lit, with the hour lamp steady', () => {
    const start = fallenGateLook(true, 0, 0.9);
    const half = fallenGateLook(true, GATE_OPENING_SECONDS / 2, 0.9);
    const done = fallenGateLook(true, GATE_OPENING_SECONDS * 2, 0.9);
    expect(start.membrane).toBe(0);
    expect(half.membrane).toBeCloseTo(0.5, 6);
    expect(done).toEqual({ lit: true, membrane: 1, blink: true });
  });

  it('copes with odd times', () => {
    expect(fallenGateLook(false, 0, Number.NaN).blink).toBe(true);
    expect(fallenGateLook(false, 0, -0.1).blink).toBe(true);
    expect(fallenGateLook(true, Number.NaN, 0).membrane).toBe(0);
  });
});
