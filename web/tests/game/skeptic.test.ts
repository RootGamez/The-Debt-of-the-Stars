import { describe, expect, it } from 'vitest';
import {
  createSkepticState,
  handOverSource,
  HER_FACTS,
  knowsHer,
  leaveWithYou,
  metBefore,
  SHOW_VERB,
  SKEPTIC_TALK,
  SKEPTIC_TALK_IDS,
  skepticGone,
  skepticStage,
  skepticVerb,
  CAMARA_SOURCE,
  type SkepticSituation,
} from '../../src/game/skeptic';
import { isLoopCut } from '../../src/game/loopCore';
import { portraitOf } from '../../src/typewriter/speech';

const situation = (overrides: Partial<SkepticSituation> = {}): SkepticSituation => ({
  metBefore: false,
  knowsHer: false,
  carrying: false,
  loopCut: false,
  ...overrides,
});

describe('which talk he gives', () => {
  it('greets a stranger the first time ever', () => {
    expect(skepticStage(situation())).toBe('saludo');
  });

  it('recognizes you when you met in an earlier cycle: he remembers every one', () => {
    expect(skepticStage(situation({ metBefore: true }))).toBe('vuelta');
  });

  it('hears about her when you know of her, met before or not', () => {
    expect(skepticStage(situation({ knowsHer: true }))).toBe('ella');
    expect(skepticStage(situation({ knowsHer: true, metBefore: true }))).toBe('ella');
  });

  it('looks at the Counterweight when you come in carrying it', () => {
    expect(skepticStage(situation({ carrying: true }))).toBe('contrapeso');
    expect(skepticStage(situation({ carrying: true, knowsHer: true }))).toBe('cuenta');
  });

  it('says goodbye once the loop is cut, whatever else is true', () => {
    expect(skepticStage(situation({ loopCut: true, carrying: true, knowsHer: true }))).toBe(
      'adios',
    );
  });

  it('speaks with his own portrait in every talk', () => {
    for (const id of SKEPTIC_TALK_IDS) expect(portraitOf(id)).toBe('esceptico');
    expect(new Set(SKEPTIC_TALK_IDS).size).toBe(Object.keys(SKEPTIC_TALK).length);
  });
});

describe('what the player knows of them', () => {
  it('knows her from any of her facts', () => {
    expect(knowsHer(new Set())).toBe(false);
    expect(knowsHer(new Set(['deuda.palabra']))).toBe(false);
    for (const fact of HER_FACTS) expect(knowsHer(new Set([fact]))).toBe(true);
  });

  it('has met him if any of his talks was opened before', () => {
    expect(metBefore([])).toBe(false);
    expect(metBefore(['taller.paginas'])).toBe(false);
    expect(metBefore([SKEPTIC_TALK.saludo])).toBe(true);
  });
});

describe('which sources can be read', () => {
  it('shows only the talk of the current stage while he is there', () => {
    for (const id of SKEPTIC_TALK_IDS) {
      expect(skepticGone(id, 'vuelta', true)).toBe(id !== SKEPTIC_TALK.vuelta);
    }
  });

  it('hides every talk once he has left', () => {
    for (const id of SKEPTIC_TALK_IDS) expect(skepticGone(id, 'adios', false)).toBe(true);
  });

  it('hides the spinning Cámara once the source is out', () => {
    expect(skepticGone(CAMARA_SOURCE, 'vuelta', true)).toBe(false);
    expect(skepticGone(CAMARA_SOURCE, 'adios', true)).toBe(true);
  });

  it('leaves other sources alone', () => {
    expect(skepticGone('taller.paginas', 'adios', false)).toBe(false);
  });

  it('offers to show the Counterweight only in the hand-over talks', () => {
    expect(skepticVerb(SKEPTIC_TALK.contrapeso, 'contrapeso')).toBe(SHOW_VERB);
    expect(skepticVerb(SKEPTIC_TALK.cuenta, 'cuenta')).toBe(SHOW_VERB);
    expect(skepticVerb(SKEPTIC_TALK.vuelta, 'vuelta')).toBeUndefined();
    expect(skepticVerb('taller.paginas', 'cuenta')).toBeUndefined();
  });
});

describe('the hand-over and the way out', () => {
  it('starts with the source in its place and him at home', () => {
    const state = createSkepticState(true);

    expect(isLoopCut(state.core)).toBe(false);
    expect(state.metBefore).toBe(true);
    expect(state.left).toBe(false);
  });

  it('fits the source into the Counterweight: the loop is cut', () => {
    const before = createSkepticState(false);
    const after = handOverSource(before);

    expect(after.core.source).toBe('inContrapeso');
    expect(isLoopCut(after.core)).toBe(true);
    expect(isLoopCut(before.core)).toBe(false);
    expect(handOverSource(after)).toBe(after);
  });

  it('only leaves with you once the loop is cut', () => {
    const home = createSkepticState(false);

    expect(leaveWithYou(home)).toBe(home);
    const out = leaveWithYou(handOverSource(home));
    expect(out.left).toBe(true);
    expect(leaveWithYou(out)).toBe(out);
  });
});
