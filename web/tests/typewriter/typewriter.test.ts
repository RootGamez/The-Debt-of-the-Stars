import { describe, expect, it } from 'vitest';
import { COMMA_PAUSE, HOLD_FACTOR, STOP_PAUSE, Typewriter } from '../../src/typewriter/typewriter';

/** Avanza en pasos de un fotograma (60 fps) durante `seconds`. */
function run(writer: Typewriter, seconds: number, rate = 1, held = false): void {
  const frame = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += frame) writer.step(frame, rate, held);
}

describe('the typewriter', () => {
  it('starts with nothing written', () => {
    const writer = new Typewriter('Hola', 40);

    expect(writer.visible).toBe(0);
    expect(writer.done).toBe(false);
    expect(writer.length).toBe(4);
  });

  it('writes letters at the chosen speed', () => {
    const writer = new Typewriter('a'.repeat(100), 40);

    run(writer, 0.5);

    expect(writer.visible).toBeGreaterThanOrEqual(19);
    expect(writer.visible).toBeLessThanOrEqual(21);
  });

  it('reports how many letters appeared in each step', () => {
    const writer = new Typewriter('abcdef', 10);

    expect(writer.step(0.25)).toBe(2);
    expect(writer.step(0.25)).toBe(3);
  });

  it('counts letters, not UTF-16 halves', () => {
    expect(new Typewriter('ñ…«»', 40).length).toBe(4);
  });

  it('waits a little after a comma and longer after a full stop', () => {
    const comma = new Typewriter('a,bcdef', 100);
    const stop = new Typewriter('a.bcdef', 100);

    // Dos letras en 0,02 s; después, la pausa.
    run(comma, 0.02 + COMMA_PAUSE - 0.02);
    run(stop, 0.02 + COMMA_PAUSE - 0.02);

    expect(comma.visible).toBe(2);
    run(comma, 0.04);
    expect(comma.visible).toBeGreaterThan(2);
    expect(stop.visible).toBe(2);
    run(stop, STOP_PAUSE - COMMA_PAUSE + 0.04);
    expect(stop.visible).toBeGreaterThan(2);
  });

  it('pauses once after an ellipsis written as three dots', () => {
    const dots = new Typewriter('a...b', 100);

    run(dots, 0.04 + STOP_PAUSE + 0.03);

    expect(dots.done).toBe(true);
  });

  it('closes the quote before pausing', () => {
    const writer = new Typewriter('«Ya.» Sí', 100);

    run(writer, 0.05);

    // «, Y, a, ., » salen seguidas; el espacio espera a la pausa.
    expect(writer.visible).toBe(5);
  });

  it('drags the text where the clock goes slow', () => {
    const normal = new Typewriter('a'.repeat(100), 40);
    const slow = new Typewriter('a'.repeat(100), 40);

    run(normal, 1);
    run(slow, 1, 0.2);

    expect(slow.visible).toBeLessThan(normal.visible / 4);
  });

  it('stretches the pauses where the clock goes slow, up to a limit', () => {
    const slow = new Typewriter('a,b', 1000);

    run(slow, 0.01 + COMMA_PAUSE * 2.5, 0.2);
    expect(slow.visible).toBe(2);
    run(slow, COMMA_PAUSE * 0.6 + 0.02, 0.2);
    expect(slow.done).toBe(true);
  });

  it('goes four times faster while the button is held', () => {
    const writer = new Typewriter('a'.repeat(200), 40);

    run(writer, 0.5, 1, true);

    expect(writer.visible).toBeGreaterThanOrEqual(40 * HOLD_FACTOR * 0.5 - 2);
  });

  it('writes everything at once with the instant speed', () => {
    const writer = new Typewriter('Todo de golpe.', Infinity);

    expect(writer.step(0)).toBe(14);
    expect(writer.done).toBe(true);
  });

  it('can be completed by the player', () => {
    const writer = new Typewriter('Una frase larga.', 40);
    writer.step(0.1);

    writer.complete();

    expect(writer.visible).toBe(writer.length);
    expect(writer.done).toBe(true);
    expect(writer.step(1)).toBe(0);
  });

  it('ignores negative or broken steps', () => {
    const writer = new Typewriter('abc', 40);

    expect(writer.step(-1)).toBe(0);
    expect(writer.step(Number.NaN)).toBe(0);
    expect(writer.visible).toBe(0);
  });

  it('is done at once with an empty text', () => {
    expect(new Typewriter('', 40).done).toBe(true);
  });
});
