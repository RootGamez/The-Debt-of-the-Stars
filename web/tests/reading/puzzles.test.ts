import { describe, expect, it } from 'vitest';
import { CONSOLE_CLOCKS, LETTERS, NOTEBOOK, ROUTE, TWINS } from '../../src/data/puzzles';
import {
  checkLetters,
  consoleReadings,
  formatDrift,
  formatMinutes,
  formatMinutesSeconds,
  lettersInOrder,
  notebook,
  routeDrift,
  slowestClock,
  twins,
  umbralDay,
} from '../../src/reading/puzzles';

describe('the notebook of the shift (Umbral)', () => {
  const book = notebook(NOTEBOOK);

  it('notes the hour of Umbral and of the Archivo, starting together', () => {
    expect(book.rows[0]).toEqual({ umbral: 0, other: 0 });
    expect(book.rows).toHaveLength(NOTEBOOK.rows);
  });

  it('lets the second column fall behind, a little more each time', () => {
    const gaps = book.rows.map((r) => r.umbral - r.other);

    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1] ?? 0);
  });

  it('asks for the last hour of the Archivo, with the clock it really keeps', () => {
    const last = book.rows.at(-1);

    expect(book.answer).toBe(last?.other);
    expect(book.answer).toBe(Math.round((last?.umbral ?? 0) * NOTEBOOK.otherRate));
  });

  it('offers distinct choices, the right one among them only once', () => {
    expect(new Set(book.options).size).toBe(book.options.length);
    expect(book.options.filter((o) => o === book.answer)).toHaveLength(1);
    expect(book.options).toContain(book.rows.at(-1)?.umbral); // la trampa: "son iguales"
  });

  it('writes hours as h:mm', () => {
    expect(formatMinutes(0)).toBe('0:00');
    expect(formatMinutes(605)).toBe('10:05');
  });
});

describe('the letters that answer before being sent (Archivo)', () => {
  it('converts each date to days of Umbral with the clock it was written with', () => {
    expect(umbralDay({ id: 'x', title: 't', clock: 'c', rate: 0.2, day: 3 })).toBeCloseTo(15);
    expect(umbralDay({ id: 'x', title: 't', clock: 'c', rate: 1, day: 12 })).toBe(12);
  });

  it('has a true order different from the order of the written dates (that is the puzzle)', () => {
    const byWrittenDate = [...LETTERS].sort((a, b) => a.day - b.day).map((l) => l.id);

    expect(lettersInOrder(LETTERS)).not.toEqual(byWrittenDate);
  });

  it('accepts the true order and nothing else', () => {
    const right = lettersInOrder(LETTERS);

    expect(checkLetters(LETTERS, right)).toBe(true);
    expect(checkLetters(LETTERS, [...right].reverse())).toBe(false);
    expect(checkLetters(LETTERS, right.slice(1))).toBe(false);
  });

  it('never has two letters on the same day of Umbral (one right answer)', () => {
    const days = LETTERS.map(umbralDay);

    expect(new Set(days).size).toBe(days.length);
  });
});

describe('the twins diaries (Taller)', () => {
  const book = twins(TWINS);

  it('both note the same storm, the technician on an earlier day of his own', () => {
    expect(book.stormTaller).toBe(17);
    expect(book.lag.answer).toBe(3);
    expect(book.lag.options).toEqual([3, 17, 20]);
  });

  it('three months on, the technician is much further behind: the lag grows with time', () => {
    expect(book.last.answer).toBe(85);
    // Las trampas: el atraso fijo de la tormenta (97), "van iguales" (100) y al revés (115).
    expect(book.last.options).toEqual([85, 97, 100, 115]);
  });
});

describe('the console of the control cabin (Taller)', () => {
  it('runs every clock at its own rate from the same start', () => {
    const readings = consoleReadings(CONSOLE_CLOCKS, 10);

    expect(readings.find((r) => r.id === 'umbral')?.minutes).toBe(10);
    expect(readings.find((r) => r.id === 'taller')?.minutes).toBeCloseTo(8.5);
  });

  it('shows one destination with no name whose clock barely moves: the slow site', () => {
    expect(slowestClock(CONSOLE_CLOCKS)).toBe('sin_nombre');
    expect(slowestClock([])).toBeUndefined();
  });
});

describe('the blackboard of the Laboratorio', () => {
  const route = routeDrift(ROUTE.legs, ROUTE.machineRate);

  it('compares, leg by leg, what the Counterweight and the machine mark', () => {
    expect(route.legs[0]).toEqual({ place: 'Laboratorio', counterweight: 2, machine: 6 });
    expect(route.legs[1]).toEqual({ place: 'El vuelo', counterweight: 5, machine: 3 });
  });

  it('adds the legs: it arrives a minute behind the machine', () => {
    expect(route.drift).toBe(-1);
    // Las trampas: solo el Laboratorio (−4), el signo al revés (+1) y "en hora" (0).
    expect(route.step.options).toEqual([-4, -1, 0, 1]);
    expect(formatDrift(route.drift)).toBe('1:00 atrasado');
    expect(formatDrift(0.5)).toBe('0:30 adelantado');
    expect(formatDrift(0)).toBe('en hora');
    expect(formatMinutesSeconds(3.4)).toBe('3:24');
  });
});
