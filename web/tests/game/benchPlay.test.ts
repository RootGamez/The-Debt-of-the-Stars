import { describe, expect, it } from 'vitest';
import { BENCH, createBenchPlay, type BenchPlay } from '../../src/game/benchPlay';

interface Game {
  play: BenchPlay;
  notch: (n: number | undefined) => void;
  hole: (n: number | undefined) => void;
}

function setup(): Game {
  let notch: number | undefined;
  let hole: number | undefined;
  const play = createBenchPlay({ nearestNotch: () => notch, nearestHole: () => hole });
  return {
    play,
    notch: (n) => {
      notch = n;
    },
    hole: (n) => {
      hole = n;
    },
  };
}

function put(game: Game, weight: 1 | 2 | 3, notch: number): void {
  game.play.actions.run(BENCH.weights[weight]);
  game.notch(notch);
  game.play.actions.run(BENCH.balance);
}

describe('the balance in play', () => {
  it('offers to take a weight, and hides it from its place once taken', () => {
    const { play } = setup();
    const source = BENCH.weights[2];

    expect(play.actions.verb(source, false)).toBe('coger');
    play.actions.run(source);
    expect(play.held).toBe(2);
    expect(play.actions.gone(source)).toBe(true);
    expect(play.actions.verb(BENCH.weights[3], false)).toBeUndefined();
  });

  it('puts a weight on the notch in front, and takes it back', () => {
    const game = setup();
    game.play.actions.run(BENCH.weights[3]);
    game.notch(4);

    expect(game.play.actions.verb(BENCH.balance, false)).toBe('poner');
    game.play.actions.run(BENCH.balance);
    expect(game.play.placement()).toEqual({ 4: 3 });
    expect(game.play.actions.verb(BENCH.balance, false)).toBe('recoger');
    game.play.actions.run(BENCH.balance);
    expect(game.play.held).toBe(3);
    expect(game.play.placement()).toEqual({});
  });

  it('leans toward the model until the weights make it level, and then opens the lid of the cradle', () => {
    const game = setup();

    expect(game.play.balanced).toBe(false);
    expect(game.play.lean).toBeLessThan(0);
    expect(game.play.actions.gone(BENCH.lid)).toBe(true);
    put(game, 3, 4);
    expect(game.play.balanced).toBe(true);
    expect(game.play.lean).toBe(0);
    expect(game.play.actions.gone(BENCH.lid)).toBe(false);
  });

  it('balances with two weights too: 3 at 2 and 2 at 3', () => {
    const game = setup();
    put(game, 3, 2);
    put(game, 2, 3);

    expect(game.play.balanced).toBe(true);
  });

  it('does not balance with the weights in the wrong notches', () => {
    const game = setup();
    put(game, 3, 6);

    expect(game.play.balanced).toBe(false);
    expect(game.play.lean).toBeGreaterThan(0);
  });
});

describe('the singing plate in play', () => {
  it('clamps a hole in front of you, and lets go of an occupied one', () => {
    const game = setup();
    game.hole(2);

    expect(game.play.actions.verb(BENCH.plate, false)).toBe('pinzar');
    game.play.actions.run(BENCH.plate);
    expect(game.play.clamps()).toEqual([2]);
    expect(game.play.actions.verb(BENCH.plate, false)).toBe('soltar');
    game.play.actions.run(BENCH.plate);
    expect(game.play.clamps()).toEqual([]);
  });

  it('can be read, not clamped, when no hole is in front or all three clamps are in', () => {
    const game = setup();

    expect(game.play.actions.verb(BENCH.plate, false)).toBeUndefined();
    for (const hole of [1, 3, 4]) {
      game.hole(hole);
      game.play.actions.run(BENCH.plate);
    }
    game.hole(5);
    expect(game.play.actions.verb(BENCH.plate, false)).toBeUndefined();
  });

  it('draws the whole symbol of sand with the clamps at 1, 3 and 5', () => {
    const game = setup();
    for (const hole of [1, 3, 5]) {
      game.hole(hole);
      game.play.actions.run(BENCH.plate);
    }

    expect(game.play.symbol).toBe(true);
    expect(game.play.figure().rings).toBe(3);
  });
});

describe('the singing plate once it sings', () => {
  it('stops taking clamps and can only be read', () => {
    const game = setup();
    for (const hole of [1, 3, 5]) {
      game.hole(hole);
      game.play.actions.run(BENCH.plate);
    }

    expect(game.play.actions.verb(BENCH.plate, false)).toBeUndefined();
    game.play.actions.run(BENCH.plate);
    expect(game.play.clamps()).toEqual([1, 3, 5]);
  });
});

describe('cycles and debugging', () => {
  it('puts everything back at the start of a cycle', () => {
    const game = setup();
    put(game, 3, 4);
    game.hole(1);
    game.play.actions.run(BENCH.plate);

    game.play.reset();

    expect(game.play.placement()).toEqual({});
    expect(game.play.clamps()).toEqual([]);
    expect(game.play.held).toBeUndefined();
    expect(game.play.actions.gone(BENCH.weights[3])).toBe(false);
  });

  it('reports its state for the debug snapshot', () => {
    const game = setup();
    put(game, 3, 4);
    game.hole(2);
    game.play.actions.run(BENCH.plate);

    expect(game.play.snapshot()).toEqual({
      placement: { 4: 3 },
      held: null,
      balanced: true,
      clamps: [2],
      symbol: false,
    });
  });
});

describe('leaving a weight anywhere', () => {
  const pose = { position: [1, 2, 3], normal: [0, 0, 1] } as const;

  it('drops the weight in hand and reports it by what it weighs', () => {
    const game = setup();
    game.play.actions.run(BENCH.weights[2]);

    expect(game.play.loosely.drop(pose)).toBe(true);

    expect(game.play.held).toBeUndefined();
    expect(game.play.looseWeights()).toEqual({ 2: pose });
  });

  it('picks it up again and puts it on a notch', () => {
    const game = setup();
    game.play.actions.run(BENCH.weights[2]);
    game.play.loosely.drop(pose);

    expect(game.play.loosely.take('pesa_2')).toBe(true);
    game.notch(3);
    game.play.actions.run(BENCH.balance);

    expect(game.play.placement()).toEqual({ 3: 2 });
    expect(game.play.looseWeights()).toEqual({});
  });

  it('forgets it with the next cycle', () => {
    const game = setup();
    game.play.actions.run(BENCH.weights[1]);
    game.play.loosely.drop(pose);

    game.play.reset();

    expect(game.play.looseWeights()).toEqual({});
  });
});
