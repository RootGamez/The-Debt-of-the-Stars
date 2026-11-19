import { describe, expect, it } from 'vitest';
import {
  createHomecomingPlay,
  DIRECTOR,
  endingFromQuery,
  MAESTRA,
  speakerFor,
  homeLook,
  endingCardKey,
  isFinal,
  viaFromQuery,
} from '../../src/game/homecoming';
import { WORMHOLE } from '../../src/game/prologue';

describe('the way home from the Archive of the Gates', () => {
  it('reads the ending from the address, only at home and only if it is one of the two', () => {
    expect(endingFromQuery('?mundo=hogar&final=A')).toBe('A');
    expect(endingFromQuery('?debug&mundo=hogar&final=tarde')).toBe('tarde');
    expect(endingFromQuery('?mundo=umbral&final=A')).toBeUndefined();
    expect(endingFromQuery('?mundo=hogar&final=B')).toBeUndefined();
    expect(endingFromQuery('?mundo=hogar&final=C')).toBeUndefined();
    expect(endingFromQuery('?mundo=hogar&final=a')).toBeUndefined();
    expect(endingFromQuery('?mundo=hogar')).toBeUndefined();
    expect(endingFromQuery('?mundo=Hogar&final=tarde')).toBe('tarde');
  });

  it('counts the good ending and arriving late as endings (both are saved)', () => {
    expect(isFinal('A')).toBe(true);
    expect(isFinal('tarde')).toBe(true);
  });

  it('is the home you left with the good ending, with the new bite on the Moon (F4)', () => {
    expect(homeLook('A')).toEqual({
      without: [],
      oolScale: 1,
      variants: { luna: 'mordida' },
      ship: true,
    });
    // Llegando tarde (F5): el Hogar de diez años después; por La Boca, a pie y sin la nave.
    expect(homeLook('tarde')).toEqual({
      without: [],
      oolScale: 1,
      variants: { hogar: 'despues' },
      ship: true,
    });
    expect(homeLook('tarde', 'boca').ship).toBe(false);
    expect(homeLook('A', 'boca').ship).toBe(true);
  });
});

describe('how the bad ending was reached', () => {
  it('reads the way from the address, only at home', () => {
    expect(viaFromQuery('?mundo=hogar&final=tarde&via=boca')).toBe('boca');
    expect(viaFromQuery('?mundo=hogar&final=tarde&via=archivo')).toBe('archivo');
    expect(viaFromQuery('?mundo=hogar&final=tarde')).toBe('archivo');
    expect(viaFromQuery('?mundo=hogar&final=tarde&via=otra')).toBe('archivo');
    expect(viaFromQuery('?mundo=umbral&via=boca')).toBe('archivo');
  });

  it('picks the card: the Mouth, or a wrong mouth of the Archive with the system saved', () => {
    expect(endingCardKey('A', 'boca')).toBe('A');
    expect(endingCardKey('A', 'archivo')).toBe('A');
    expect(endingCardKey('tarde', 'boca')).toBe('tarde');
    expect(endingCardKey('tarde', 'archivo')).toBe('tardeSalvado');
  });
});

describe('closing the journey with the Director', () => {
  it('offers to talk to her, and talking ends the journey once', () => {
    let ends = 0;
    const play = createHomecomingPlay('tarde', () => {
      ends += 1;
    });

    expect(play.actions.verb(DIRECTOR, true)).toBe('hablar');
    expect(play.actions.verb(MAESTRA, false)).toBeUndefined();
    play.actions.run(MAESTRA);
    expect(play.ended).toBe(false);
    play.actions.run(DIRECTOR);
    play.actions.run(DIRECTOR);

    expect(ends).toBe(1);
    expect(play.ended).toBe(true);
    expect(play.actions.verb(DIRECTOR, false)).toBeUndefined();
  });

  it('is the Teacher, not the Director, who closes the good ending (D14)', () => {
    let ends = 0;
    const play = createHomecomingPlay('A', () => {
      ends += 1;
    });

    expect(speakerFor('A')).toBe(MAESTRA);
    expect(speakerFor('tarde')).toBe(DIRECTOR);
    expect(play.actions.verb(MAESTRA, true)).toBe('hablar');
    expect(play.actions.verb(DIRECTOR, false)).toBeUndefined();
    play.actions.run(DIRECTOR);
    expect(ends).toBe(0);
    play.actions.run(MAESTRA);
    expect(ends).toBe(1);
  });

  it('has no Moon fragment to examine in the earlier home, but it is there when arriving late', () => {
    const early = createHomecomingPlay('A', () => undefined);
    const late = createHomecomingPlay('tarde', () => undefined);

    expect(early.actions.gone(WORMHOLE.source)).toBe(true);
    expect(early.actions.gone(MAESTRA)).toBe(false);
    expect(late.actions.gone(WORMHOLE.source)).toBe(false);
  });
});
