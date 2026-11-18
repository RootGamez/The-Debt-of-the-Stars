import { describe, expect, it } from 'vitest';
import {
  GREAT_TEST_DAY,
  HOME_MOUTHS,
  arrivalDay,
  arrivesBefore,
  endingFor,
  isDragged,
  formatHomeDay,
  mouthById,
  mouthRows,
  testDayLine,
  type MouthId,
} from '../../src/game/epilogue';

function mouth(id: MouthId) {
  const found = mouthById(id);
  if (!found) throw new Error(id);
  return found;
}

describe('the home mouths of the Archive of the Gates', () => {
  it('arrive at the day you see, moved by their offset', () => {
    expect(arrivalDay(mouth('fragmentos'))).toBe(46);
    expect(arrivalDay(mouth('instituto'))).toBe(3);
    expect(arrivalDay(mouth('anochecer'))).toBe(50);
    expect(arrivalDay(mouth('pronto'))).toBeUndefined();
  });

  it('let only one through before the great test, and not the one that looks closest', () => {
    const before = HOME_MOUTHS.filter(arrivesBefore).map((m) => m.id);

    expect(before).toEqual(['instituto']);
    // La trampa: todas las abiertas se ven antes de la prueba.
    for (const m of HOME_MOUTHS)
      if (m.seen !== undefined) expect(m.seen).toBeLessThan(GREAT_TEST_DAY);
  });

  it('decide the ending by themselves: the younger Institute is the good one, the others are late', () => {
    expect(endingFor(mouth('instituto'))).toBe('A');
    expect(endingFor(mouth('anochecer'))).toBe('tarde');
    expect(endingFor(mouth('fragmentos'))).toBe('tarde');
    expect(endingFor(mouth('pronto'))).toBeUndefined();
  });

  it('drag the ones that fall after the great test into the collapse', () => {
    expect(isDragged(mouth('fragmentos'))).toBe(true);
    expect(isDragged(mouth('anochecer'))).toBe(true);
    expect(isDragged(mouth('instituto'))).toBe(false);
    expect(isDragged(mouth('pronto'))).toBe(false);
  });

  it('keep the offsets of the plan table', () => {
    expect(HOME_MOUTHS.map((m) => [m.id, m.seen, m.offset])).toEqual([
      ['fragmentos', 2, 44],
      ['instituto', -400, 403],
      ['anochecer', 38, 12],
      ['pronto', undefined, undefined],
    ]);
  });

  it('show their offset only once K7 is understood, and the test day only with K8', () => {
    const blind = mouthRows({ offsets: false, testDay: false });
    const seeing = mouthRows({ offsets: true, testDay: false });

    expect(blind.every((row) => row.offset === undefined)).toBe(true);
    expect(blind.find((row) => row.id === 'fragmentos')?.seen).toBe(
      'Se ve el día 2 desde que despegaste.',
    );
    expect(seeing.find((row) => row.id === 'instituto')?.offset).toMatch(/403 días después/);
    expect(seeing.find((row) => row.id === 'pronto')).toMatchObject({ open: false });
    expect(testDayLine({ offsets: true, testDay: false })).toBeUndefined();
    expect(testDayLine({ offsets: false, testDay: true })).toBe(
      'La prueba mayor es el día 40 desde que despegaste.',
    );
  });

  it('count home days from the day you took off', () => {
    expect(formatHomeDay(0)).toBe('el día que despegaste');
    expect(formatHomeDay(-1)).toBe('1 día antes de despegar');
    expect(formatHomeDay(-400)).toBe('400 días antes de despegar');
  });
});
