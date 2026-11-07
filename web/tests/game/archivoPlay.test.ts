import { describe, expect, it } from 'vitest';
import {
  ARCHIVO_PLAY,
  createArchivoPlay,
  sphereSource,
  type ArchivoPlay,
} from '../../src/game/archivoPlay';
import { ORRERY } from '../../src/puzzles/orrery';

interface Game {
  play: ArchivoPlay;
  at: (rail: number | undefined) => void;
}

function setup(): Game {
  let rail: number | undefined;
  const play = createArchivoPlay({ nearestRail: () => rail });
  return {
    play,
    at: (next) => {
      rail = next;
    },
  };
}

function take(game: Game, source: string): void {
  game.play.actions.run(source);
}

/** Coge la esfera y la pone en ese riel. */
function put(game: Game, sphere: (typeof ORRERY.spheres)[number], rail: number): void {
  take(game, sphereSource(sphere));
  game.at(rail);
  game.play.actions.run(ARCHIVO_PLAY.orrery);
}

function solve(game: Game): void {
  put(game, 'taller', 1);
  put(game, 'cicatriz', 2);
  put(game, 'archivo', 3);
  put(game, 'umbral', 4);
  put(game, 'observatorio', 6);
}

describe('the spheres of the orrery in play', () => {
  it('offers to take a sphere and hides it from its pedestal once taken', () => {
    const { play } = setup();
    const source = sphereSource('taller');

    expect(play.actions.verb(source, false)).toBe('coger');
    expect(play.actions.gone(source)).toBe(false);
    play.actions.run(source);
    expect(play.held).toBe('taller');
    expect(play.actions.gone(source)).toBe(true);
    expect(play.actions.verb(sphereSource('umbral'), false)).toBeUndefined();
  });

  it('puts a sphere on the rail in front and takes it back', () => {
    const game = setup();
    take(game, sphereSource('umbral'));
    game.at(2);

    expect(game.play.actions.verb(ARCHIVO_PLAY.orrery, false)).toBe('poner');
    game.play.actions.run(ARCHIVO_PLAY.orrery);
    expect(game.play.placement()).toEqual({ 2: 'umbral' });
    expect(game.play.actions.verb(ARCHIVO_PLAY.orrery, false)).toBe('recoger');
    game.play.actions.run(ARCHIVO_PLAY.orrery);
    expect(game.play.held).toBe('umbral');
    expect(game.play.placement()).toEqual({});
  });

  it('lets the table be read when there is nothing to do with it', () => {
    const game = setup();

    expect(game.play.actions.verb(ARCHIVO_PLAY.orrery, false)).toBeUndefined();
    game.at(1);
    expect(game.play.actions.verb(ARCHIVO_PLAY.orrery, false)).toBeUndefined();
  });

  it('is solved with every sphere on its rail, and the crank then turns until it stops', () => {
    const game = setup();
    solve(game);

    expect(game.play.orreryRight).toBe(true);
    expect(game.play.crank).toBe(0);
    game.play.update(6);
    expect(game.play.crank).toBeGreaterThan(0.3);
    game.play.update(20);
    expect(game.play.crank).toBe(1);
  });

  it('is not solved with the spheres in the wrong rails, nor with one on the empty rail', () => {
    const game = setup();
    put(game, 'taller', 1);
    put(game, 'cicatriz', 2);
    put(game, 'archivo', 4);
    put(game, 'umbral', 3);
    put(game, 'observatorio', 5);

    game.play.update(30);
    expect(game.play.orreryRight).toBe(false);
    expect(game.play.crank).toBe(0);
  });

  it('locks the table once everything is in place: it can only be read', () => {
    const game = setup();
    solve(game);
    game.at(3);

    expect(game.play.actions.verb(ARCHIVO_PLAY.orrery, false)).toBeUndefined();
    game.play.actions.run(ARCHIVO_PLAY.orrery);
    expect(game.play.orreryRight).toBe(true);
  });

  it('loses the alignment when a sphere is taken out before it is complete', () => {
    const game = setup();
    put(game, 'taller', 1);
    game.at(1);
    game.play.actions.run(ARCHIVO_PLAY.orrery);

    expect(game.play.placement()).toEqual({});
    expect(game.play.crank).toBe(0);
  });
});

describe('the prism of the slot in play', () => {
  it('is taken from the floor and fitted on its stand', () => {
    const game = setup();

    expect(game.play.actions.verb(ARCHIVO_PLAY.prism, false)).toBe('coger');
    take(game, ARCHIVO_PLAY.prism);
    expect(game.play.held).toBe('prisma');
    expect(game.play.actions.verb(ARCHIVO_PLAY.stand, false)).toBe('poner');
    game.play.actions.run(ARCHIVO_PLAY.stand);
    expect(game.play.prismFitted).toBe(true);
    expect(game.play.actions.verb(ARCHIVO_PLAY.stand, false)).toBe('recoger');
  });

  it('keeps the tablet of the light slot out of reach until the prism is fitted', () => {
    const game = setup();

    expect(game.play.actions.gone(ARCHIVO_PLAY.slotTablet)).toBe(true);
    take(game, ARCHIVO_PLAY.prism);
    game.play.actions.run(ARCHIVO_PLAY.stand);
    expect(game.play.actions.gone(ARCHIVO_PLAY.slotTablet)).toBe(false);
  });

  it('takes nothing but the prism to its stand', () => {
    const game = setup();
    take(game, sphereSource('taller'));

    expect(game.play.actions.verb(ARCHIVO_PLAY.stand, false)).toBeUndefined();
  });
});

describe('cycles and debugging', () => {
  it('puts everything back at the start of a cycle', () => {
    const game = setup();
    solve(game);
    take(game, ARCHIVO_PLAY.prism);
    game.play.actions.run(ARCHIVO_PLAY.stand);
    game.play.update(30);

    game.play.reset();

    expect(game.play.placement()).toEqual({});
    expect(game.play.held).toBeUndefined();
    expect(game.play.prismFitted).toBe(false);
    expect(game.play.crank).toBe(0);
    expect(game.play.actions.gone(sphereSource('taller'))).toBe(false);
  });

  it('reports its state for the debug snapshot', () => {
    const game = setup();
    put(game, 'taller', 1);

    expect(game.play.snapshot()).toEqual({
      placement: { 1: 'taller' },
      held: null,
      solved: false,
      crank: 0,
      prism: false,
    });
  });
});
