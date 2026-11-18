import { describe, expect, it } from 'vitest';
import { SHOW_VERB, SKEPTIC_TALK } from '../../src/game/skeptic';
import { createSkepticPlay } from '../../src/game/skepticPlay';

function setup(overrides: { opened?: string[]; known?: string[]; carrying?: boolean } = {}) {
  const world = {
    opened: overrides.opened ?? [],
    known: new Set(overrides.known ?? []),
    carrying: overrides.carrying ?? false,
    handOvers: 0,
    read: [] as string[],
  };
  const play = createSkepticPlay({
    opened: () => world.opened,
    known: () => world.known,
    carrying: () => world.carrying,
    onHandOver: () => {
      world.handOvers++;
    },
    read: (id) => world.read.push(id),
  });
  return { play, world };
}

describe('playing the talk of the skeptic', () => {
  it('greets you the first time and only shows that talk', () => {
    const { play } = setup();

    expect(play.stage).toBe('saludo');
    expect(play.actions.gone(SKEPTIC_TALK.saludo)).toBe(false);
    expect(play.actions.gone(SKEPTIC_TALK.vuelta)).toBe(true);
    expect(play.actions.verb(SKEPTIC_TALK.saludo, true)).toBeUndefined();
  });

  it('remembers you from an earlier cycle, but not from earlier in this one', () => {
    const { play, world } = setup();
    world.opened = [SKEPTIC_TALK.saludo];
    expect(play.stage).toBe('saludo');

    play.restart();

    expect(play.stage).toBe('vuelta');
  });

  it('follows what you know of her and what you carry', () => {
    const { play, world } = setup({ known: ['silencio.investigadora'] });
    expect(play.stage).toBe('ella');

    world.carrying = true;

    expect(play.stage).toBe('cuenta');
    expect(play.actions.verb(SKEPTIC_TALK.cuenta, false)).toBe(SHOW_VERB);
  });

  it('takes the Counterweight, fits the source and cuts the loop, then the talk shows', () => {
    const { play, world } = setup({ carrying: true });

    play.actions.run(SKEPTIC_TALK.contrapeso);

    expect(world.handOvers).toBe(1);
    expect(world.read).toEqual([SKEPTIC_TALK.contrapeso]);
    expect(play.loopCut).toBe(true);
    expect(play.stage).toBe('adios');
    expect(play.actions.gone(SKEPTIC_TALK.adios)).toBe(false);
  });

  it('ignores running a talk that has no verb', () => {
    const { play, world } = setup();

    play.actions.run(SKEPTIC_TALK.saludo);

    expect(world.handOvers).toBe(0);
    expect(play.loopCut).toBe(false);
  });

  it('leaves with you once the loop is cut, and then his talk is gone', () => {
    const { play, world } = setup({ carrying: true });
    play.leave();
    expect(play.state.left).toBe(false);

    play.actions.run(SKEPTIC_TALK.contrapeso);
    play.leave();

    expect(play.state.left).toBe(true);
    expect(play.actions.gone(SKEPTIC_TALK.adios)).toBe(true);
    expect(world.read).toHaveLength(1);
  });

  it('starts every new cycle with the source back in place (also after «Sin vuelta»)', () => {
    const { play } = setup({ carrying: true });
    play.actions.run(SKEPTIC_TALK.contrapeso);

    play.restart();

    expect(play.loopCut).toBe(false);
    expect(play.state.left).toBe(false);
    expect(play.snapshot()).toMatchObject({ source: 'inPlace', left: false, metBefore: false });
  });
});

describe('debugging the hand-over', () => {
  it('cuts the loop once, without reading anything', () => {
    const { play, world } = setup();

    play.forceHandOver();
    play.forceHandOver();

    expect(play.loopCut).toBe(true);
    expect(world.handOvers).toBe(1);
    expect(world.read).toEqual([]);
  });
});
