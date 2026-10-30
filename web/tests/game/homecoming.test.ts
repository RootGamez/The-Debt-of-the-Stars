import { describe, expect, it } from 'vitest';
import {
  createHomecomingPlay,
  DIRECTOR,
  endingFromQuery,
  homeLook,
  isFinal,
  NOT_YET_ARRIVED,
  YOUNGER_OOL,
} from '../../src/game/homecoming';
import { WORMHOLE } from '../../src/game/prologue';

describe('the way home from the Archive of the Gates', () => {
  it('reads the ending from the address, only at home and only if it is one of the three', () => {
    expect(endingFromQuery('?mundo=hogar&final=A')).toBe('A');
    expect(endingFromQuery('?debug&mundo=hogar&final=tarde')).toBe('tarde');
    expect(endingFromQuery('?mundo=umbral&final=B')).toBeUndefined();
    expect(endingFromQuery('?mundo=hogar&final=C')).toBeUndefined();
    expect(endingFromQuery('?mundo=hogar&final=a')).toBeUndefined();
    expect(endingFromQuery('?mundo=hogar')).toBeUndefined();
    expect(endingFromQuery('?mundo=Hogar&final=B')).toBe('B');
  });

  it('counts A and B as endings, and arriving late as not one', () => {
    expect(isFinal('A')).toBe(true);
    expect(isFinal('B')).toBe(true);
    expect(isFinal('tarde')).toBe(false);
  });

  it('is the earlier home with A and B: no fragments yet and younger Ool', () => {
    expect(homeLook('A')).toEqual({ without: NOT_YET_ARRIVED, oolScale: YOUNGER_OOL });
    expect(homeLook('B').without).toContain('luna_Fragmento');
    expect(homeLook('tarde')).toEqual({ without: [], oolScale: 1 });
    expect(YOUNGER_OOL).toBeLessThan(1);
  });
});

describe('closing the journey with the Director', () => {
  it('offers to talk to her, and talking ends the journey once', () => {
    let ends = 0;
    const play = createHomecomingPlay('B', () => {
      ends += 1;
    });

    expect(play.actions.verb(DIRECTOR, true)).toBe('hablar');
    expect(play.actions.verb('instituto.maestra', false)).toBeUndefined();
    play.actions.run('instituto.maestra');
    expect(play.ended).toBe(false);
    play.actions.run(DIRECTOR);
    play.actions.run(DIRECTOR);

    expect(ends).toBe(1);
    expect(play.ended).toBe(true);
    expect(play.actions.verb(DIRECTOR, false)).toBeUndefined();
  });

  it('has no Moon fragment to examine in the earlier home, but it is there when arriving late', () => {
    const early = createHomecomingPlay('A', () => undefined);
    const late = createHomecomingPlay('tarde', () => undefined);

    expect(early.actions.gone(WORMHOLE.source)).toBe(true);
    expect(early.actions.gone(DIRECTOR)).toBe(false);
    expect(late.actions.gone(WORMHOLE.source)).toBe(false);
  });
});
