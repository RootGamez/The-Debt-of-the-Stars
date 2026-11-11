import { describe, expect, it } from 'vitest';
import {
  BELLS_CHANNEL,
  BELLS_LECTERN,
  BELLS_RACK,
  createBellsPlay,
  type BellsPlay,
} from '../../src/game/bellsPlay';

interface Game {
  play: BellsPlay;
  at: (mark: number | undefined) => void;
}

function setup(initialMark: number | undefined = 1): Game {
  let mark: number | undefined = initialMark;
  const play = createBellsPlay({ nearestMark: () => mark });
  return {
    play,
    at: (next) => {
      mark = next;
    },
  };
}

/** Coge una campana y la pone en esta marca, andando hasta ella. */
function placeOne(game: Game, mark: number): void {
  game.play.actions.run(BELLS_RACK);
  game.at(mark);
  game.play.actions.run(BELLS_CHANNEL);
}

function placeAt(game: Game, marks: readonly number[]): void {
  for (const mark of marks) placeOne(game, mark);
}

describe('the bells in play', () => {
  it('offers to take a bell from the rack while the hands are free', () => {
    const { play } = setup();

    expect(play.actions.verb(BELLS_RACK, false)).toBe('coger');
    play.actions.run(BELLS_RACK);
    expect(play.held).toBe(true);
    expect(play.actions.verb(BELLS_RACK, false)).toBeUndefined();
  });

  it('offers to set the bell on the channel only when it is held and the mark is free', () => {
    const game = setup(4);

    expect(game.play.actions.verb(BELLS_CHANNEL, false)).toBeUndefined();
    game.play.actions.run(BELLS_RACK);
    expect(game.play.actions.verb(BELLS_CHANNEL, false)).toBe('poner');
    game.play.actions.run(BELLS_CHANNEL);
    expect(game.play.placedMarks()).toEqual([4]);
    expect(game.play.held).toBe(false);
  });

  it('offers to take a placed bell back, and not when standing away from the channel', () => {
    const game = setup(4);
    placeOne(game, 4);

    expect(game.play.actions.verb(BELLS_CHANNEL, false)).toBe('recoger');
    game.at(undefined);
    expect(game.play.actions.verb(BELLS_CHANNEL, false)).toBeUndefined();
    game.at(4);
    game.play.actions.run(BELLS_CHANNEL);
    expect(game.play.placedMarks()).toEqual([]);
    expect(game.play.held).toBe(true);
  });

  it('rings the placed bells as the ball goes by, once per roll', () => {
    const game = setup();
    placeAt(game, [1, 4]);

    expect(game.play.update(0).rings).toEqual([]);
    expect(game.play.update(1.2).rings).toHaveLength(1);
    expect(game.play.update(2.5).rings).toHaveLength(1);
    expect(game.play.update(10).rings).toEqual([]);
    expect(game.play.update(21.5).rings).toHaveLength(1);
  });

  it('shows where the ball is while it rolls', () => {
    const { play } = setup();

    expect(play.update(0).ball).toBe(0);
    expect(play.update(2).ball).toBeCloseTo(1.6, 6);
    expect(play.update(10).ball).toBeUndefined();
  });

  it('opens the lectern once the four bells ring in time, and keeps it open for the cycle', () => {
    const game = setup();
    placeAt(game, [1, 4, 9, 16]);

    expect(game.play.solved).toBe(false);
    game.play.update(0);
    game.play.update(4.5);
    expect(game.play.solved).toBe(true);
    game.play.actions.run(BELLS_CHANNEL);
    game.play.update(30);
    expect(game.play.solved).toBe(true);
  });

  it('does not open it with the bells at equal distances', () => {
    const game = setup();
    placeAt(game, [4, 8, 12, 16]);

    game.play.update(0);
    game.play.update(4.5);
    game.play.update(21);
    game.play.update(25);
    expect(game.play.solved).toBe(false);
  });

  it('puts everything back at the start of a cycle', () => {
    const game = setup();
    placeAt(game, [1, 4, 9, 16]);
    game.play.update(0);
    game.play.update(4.5);

    game.play.reset();

    expect(game.play.solved).toBe(false);
    expect(game.play.placedMarks()).toEqual([]);
    expect(game.play.held).toBe(false);
    expect(game.play.actions.verb(BELLS_RACK, false)).toBe('coger');
  });

  it('has nothing to do with the lectern but read it, and nothing is ever taken away', () => {
    const { play } = setup();

    expect(play.actions.verb(BELLS_LECTERN, false)).toBeUndefined();
    expect(play.actions.gone(BELLS_RACK)).toBe(false);
  });

  it('reports its state for the debug snapshot', () => {
    const game = setup();
    placeAt(game, [1, 9]);

    expect(game.play.snapshot()).toEqual({ placed: [1, 9], held: false, solved: false });
  });

  it('says where every bell is: on the rack, in the hands or on a mark', () => {
    const game = setup();
    placeOne(game, 9);
    game.play.actions.run(BELLS_RACK);

    expect(game.play.bells()).toEqual([
      { id: 'campana_1', where: { mark: 9 } },
      { id: 'campana_2', where: 'hands' },
      { id: 'campana_3', where: 'rack' },
      { id: 'campana_4', where: 'rack' },
    ]);
  });
});

describe('leaving a bell anywhere', () => {
  const pose = { position: [1, 2, 3], normal: [0, 0, 1] } as const;

  it('drops the bell in hand where it is told, and shows it there', () => {
    const game = setup();
    game.play.actions.run(BELLS_RACK);

    expect(game.play.loosely.drop(pose)).toBe(true);

    expect(game.play.held).toBe(false);
    const loose = game.play
      .bells()
      .filter((bell) => typeof bell.where === 'object' && 'loose' in bell.where);
    expect(loose).toHaveLength(1);
    expect(game.play.onRack()).toBe(3);
    expect(game.play.placedMarks()).toEqual([]);
  });

  it('picks it up again to place it on the channel afterwards', () => {
    const game = setup();
    game.play.actions.run(BELLS_RACK);
    game.play.loosely.drop(pose);
    const [first] = game.play.loosely.loose();

    expect(game.play.loosely.take(first?.id ?? '')).toBe(true);
    game.play.actions.run(BELLS_CHANNEL);

    expect(game.play.placedMarks()).toEqual([1]);
  });

  it('does not let a loose bell count as placed, nor be taken from the rack again', () => {
    const game = setup();
    game.play.actions.run(BELLS_RACK);
    game.play.loosely.drop(pose);
    game.play.actions.run(BELLS_RACK);
    game.play.actions.run(BELLS_RACK);

    expect(game.play.loosely.loose()).toHaveLength(1);
    expect(game.play.onRack()).toBe(2);
  });

  it('sends it back to the rack with the next cycle', () => {
    const game = setup();
    game.play.actions.run(BELLS_RACK);
    game.play.loosely.drop(pose);

    game.play.reset();

    expect(game.play.loosely.loose()).toEqual([]);
    expect(game.play.onRack()).toBe(4);
  });
});
