import { describe, expect, it } from 'vitest';
import { DEPTHS, createDepthsPlay, type DepthsPlay } from '../../src/game/depthsPlay';

interface Game {
  play: DepthsPlay;
  near: (pendulum: number | undefined) => void;
}

function setup(): Game {
  let pendulum: number | undefined;
  const play = createDepthsPlay({ nearestPendulum: () => pendulum });
  return {
    play,
    near: (next) => {
      pendulum = next;
    },
  };
}

function throwIn(game: Game, pile: keyof typeof DEPTHS.piles): void {
  game.play.actions.run(DEPTHS.piles[pile]);
  game.play.actions.run(DEPTHS.cistern);
}

describe('the cistern in play', () => {
  it('offers to take from a pile only with free hands, and to throw it in while carrying', () => {
    const { play } = setup();
    const pile = DEPTHS.piles.b2;

    expect(play.actions.verb(pile, false)).toBe('coger');
    expect(play.actions.verb(DEPTHS.cistern, false)).toBeUndefined();
    play.actions.run(pile);
    expect(play.held).toBe('b2');
    expect(play.actions.verb(pile, false)).toBeUndefined();
    expect(play.actions.verb(DEPTHS.cistern, false)).toBe('echar');
  });

  it('raises the water with each stone and not with the wood', () => {
    const game = setup();
    throwIn(game, 'b3');
    expect(game.play.level).toBe(3);
    throwIn(game, 'wood');
    expect(game.play.level).toBe(3);
    expect(game.play.held).toBeUndefined();
  });

  it('runs out of each pile', () => {
    const game = setup();
    for (let k = 0; k < 2; k++) throwIn(game, 'wood');

    expect(game.play.actions.verb(DEPTHS.piles.wood, false)).toBeUndefined();
    expect(game.play.actions.gone(DEPTHS.piles.wood)).toBe(true);
    expect(game.play.remaining('wood')).toBe(0);
  });

  it('spills back to the second mark when it passes the third', () => {
    const game = setup();
    throwIn(game, 'b3');
    throwIn(game, 'b3');
    throwIn(game, 'b3');

    expect(game.play.level).toBe(5);
    expect(game.play.cisternFull).toBe(false);
  });

  it('opens the records on the barge with seven parts and then stops taking stones', () => {
    const game = setup();
    throwIn(game, 'b3');
    throwIn(game, 'b3');
    throwIn(game, 'b1');

    expect(game.play.cisternFull).toBe(true);
    expect(game.play.actions.gone('archivo.fondo_canon')).toBe(false);
    game.play.actions.run(DEPTHS.piles.b1);
    expect(game.play.actions.verb(DEPTHS.cistern, false)).toBeUndefined();
    game.play.actions.run(DEPTHS.cistern);
    expect(game.play.level).toBe(7);
  });

  it('keeps the records of the canyon floor out of reach until it is full', () => {
    expect(setup().play.actions.gone('archivo.fondo_canon')).toBe(true);
  });
});

describe('the pendulums in play', () => {
  it('lengthens the pendulum in front notch by notch, and wraps around', () => {
    const game = setup();
    game.near(2);

    expect(game.play.actions.verb(DEPTHS.pendulums, false)).toBe('alargar');
    game.play.actions.run(DEPTHS.pendulums);
    expect(game.play.lengths()).toEqual([3, 4, 3, 3, 3]);
    game.play.actions.run(DEPTHS.pendulums);
    game.play.actions.run(DEPTHS.pendulums);
    expect(game.play.lengths()).toEqual([3, 1, 3, 3, 3]);
  });

  it('has nothing to do away from the beam', () => {
    const game = setup();

    expect(game.play.actions.verb(DEPTHS.pendulums, false)).toBeUndefined();
  });

  it('opens the hatch only with the staircase of the Counterweight', () => {
    const game = setup();
    const set = (pendulum: number, to: number): void => {
      game.near(pendulum);
      while (game.play.lengths()[pendulum - 1] !== to) game.play.actions.run(DEPTHS.pendulums);
    };

    expect(game.play.hatchOpen).toBe(false);
    [1, 3, 2, 5, 4].forEach((length, index) => {
      set(index + 1, length);
    });
    expect(game.play.hatchOpen).toBe(true);
    set(1, 2);
    expect(game.play.hatchOpen).toBe(false);
  });

  it('keeps the loose pendulums swinging in unison until they are apart', () => {
    const game = setup();

    expect(game.play.swing(0, 3.1)).toBeCloseTo(game.play.swing(4, 3.1), 9);
  });
});

describe('cycles and debugging', () => {
  it('puts everything back at the start of a cycle', () => {
    const game = setup();
    throwIn(game, 'b3');
    game.near(1);
    game.play.actions.run(DEPTHS.pendulums);

    game.play.reset();

    expect(game.play.level).toBe(0);
    expect(game.play.lengths()).toEqual([3, 3, 3, 3, 3]);
    expect(game.play.remaining('b3')).toBe(3);
  });

  it('reports its state for the debug snapshot', () => {
    const game = setup();
    throwIn(game, 'b2');

    expect(game.play.snapshot()).toEqual({
      lengths: [3, 3, 3, 3, 3],
      held: null,
      level: 2,
      full: false,
      hatch: false,
    });
  });
});
