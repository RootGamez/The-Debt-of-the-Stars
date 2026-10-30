import { describe, expect, it } from 'vitest';
import {
  GREAT_TEST_DAY,
  HOME_MOUTHS,
  PLANS,
  arrivalDay,
  arrivesBefore,
  createEpiloguePlay,
  endingFor,
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
    expect(arrivalDay(mouth('instituto'))).toBe(-120);
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

  it('decide the ending together with the plans', () => {
    expect(endingFor(mouth('instituto'), false)).toBe('A');
    expect(endingFor(mouth('instituto'), true)).toBe('B');
    expect(endingFor(mouth('anochecer'), false)).toBe('tarde');
    expect(endingFor(mouth('fragmentos'), true)).toBe('tarde');
    expect(endingFor(mouth('pronto'), false)).toBeUndefined();
  });

  it('show their offset only once K7 is understood, and the test day only with K8', () => {
    const blind = mouthRows({ offsets: false, testDay: false });
    const seeing = mouthRows({ offsets: true, testDay: false });

    expect(blind.every((row) => row.offset === undefined)).toBe(true);
    expect(blind.find((row) => row.id === 'fragmentos')?.seen).toBe(
      'Se ve el día 2 desde que despegaste.',
    );
    expect(seeing.find((row) => row.id === 'instituto')?.offset).toMatch(/280 días después/);
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

describe('the plans of the Counterweight', () => {
  it('are examined first, then taken and left again', () => {
    const play = createEpiloguePlay();

    expect(play.actions.verb(PLANS, true)).toBeUndefined();
    expect(play.actions.verb(PLANS, false)).toBe('coger');
    play.actions.run(PLANS);
    expect(play.carryingPlans).toBe(true);
    expect(play.actions.verb(PLANS, false)).toBe('dejar');
    play.actions.run(PLANS);
    expect(play.carryingPlans).toBe(false);
    expect(play.actions.gone(PLANS)).toBe(false);
    expect(play.actions.verb('puertas.bocas', false)).toBeUndefined();
  });
});
