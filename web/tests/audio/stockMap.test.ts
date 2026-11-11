import { describe, expect, it } from 'vitest';
import {
  buildCredits,
  buildIndex,
  matchPattern,
  resolveStockMap,
  type StockMap,
} from '../../scripts/audio/stockMap';

const PACKS = {
  impact: {
    name: 'Impact Sounds',
    url: 'https://kenney.nl/assets/impact-sounds',
    author: 'Kenney',
    license: 'CC0',
  },
  rpg: {
    name: 'RPG Audio',
    url: 'https://kenney.nl/assets/rpg-audio',
    author: 'Kenney',
    license: 'CC0',
  },
};

const AVAILABLE = {
  impact: [
    'footstep_concrete_001',
    'footstep_concrete_000',
    'footstep_snow_000',
    'impactMetal_light_000',
  ],
  rpg: ['cloth1', 'cloth2', 'footstep00', 'footstep01'],
};

const CLOTH = { category: 'foley', from: ['rpg:cloth*', 'rpg:footstep01'] };

const MAP: StockMap = {
  version: 1,
  packs: PACKS,
  sounds: {
    'step.rock': { category: 'foley', gain: 0.8, from: ['impact:footstep_concrete_*'] },
    'step.cloth': CLOTH,
    'ship.hit': { category: 'ship', loop: true, trim: 1.5, from: ['impact:impactMetal_light_000'] },
  },
};

describe('matchPattern', () => {
  it('matches a name exactly', () => {
    expect(matchPattern('cloth1', ['cloth1', 'cloth2'])).toEqual(['cloth1']);
  });

  it('matches a prefix with a trailing star, in alphabetical order', () => {
    expect(matchPattern('footstep_concrete_*', AVAILABLE.impact)).toEqual([
      'footstep_concrete_000',
      'footstep_concrete_001',
    ]);
  });

  it('matches nothing when nothing fits', () => {
    expect(matchPattern('nada*', AVAILABLE.impact)).toEqual([]);
    expect(matchPattern('nada', AVAILABLE.impact)).toEqual([]);
  });
});

describe('resolveStockMap', () => {
  it('gathers the files of every pattern, once each, with their output names', () => {
    const { sounds, problems } = resolveStockMap(MAP, AVAILABLE);

    expect(problems).toEqual([]);
    expect(sounds['step.rock']?.files).toEqual([
      { pack: 'impact', source: 'footstep_concrete_000', out: 'step_rock_1.mp3' },
      { pack: 'impact', source: 'footstep_concrete_001', out: 'step_rock_2.mp3' },
    ]);
    expect(sounds['step.cloth']?.files.map((f) => f.source)).toEqual([
      'cloth1',
      'cloth2',
      'footstep01',
    ]);
  });

  it('passes the low-pass filter of a sound through', () => {
    const map: StockMap = {
      ...MAP,
      sounds: { 'a.b': { category: 'foley', lowpass: 3000, from: ['rpg:cloth1'] } },
    };

    expect(resolveStockMap(map, AVAILABLE).sounds['a.b']?.lowpass).toBe(3000);
    expect(resolveStockMap(MAP, AVAILABLE).sounds['step.cloth']?.lowpass).toBeUndefined();
  });

  it('keeps the defaults and the options of each sound', () => {
    const { sounds } = resolveStockMap(MAP, AVAILABLE);

    expect(sounds['step.cloth']).toMatchObject({ category: 'foley', gain: 1, loop: false });
    expect(sounds['ship.hit']).toMatchObject({ category: 'ship', gain: 1, loop: true, trim: 1.5 });
    expect(sounds['step.rock']?.trim).toBeUndefined();
  });

  it('reports a pattern that matches nothing and drops that sound', () => {
    const broken: StockMap = {
      ...MAP,
      sounds: { 'a.b': { category: 'ui', from: ['impact:noexiste*'] }, ok: CLOTH },
    };

    const { sounds, problems } = resolveStockMap(broken, AVAILABLE);

    expect(Object.keys(sounds)).toEqual(['ok']);
    expect(problems).toEqual(['a.b: «impact:noexiste*» no encuentra ningún archivo']);
  });

  it('reports an unknown pack', () => {
    const broken: StockMap = {
      ...MAP,
      sounds: { 'a.b': { category: 'ui', from: ['otro:click_001'] } },
    };

    const { sounds, problems } = resolveStockMap(broken, AVAILABLE);

    expect(sounds).toEqual({});
    expect(problems[0]).toContain('paquete «otro»');
  });

  it('reports a pattern written wrong', () => {
    const broken: StockMap = {
      ...MAP,
      sounds: { 'a.b': { category: 'ui', from: ['sinpaquete'] } },
    };

    expect(resolveStockMap(broken, AVAILABLE).problems[0]).toContain('paquete:nombre');
  });

  it('never repeats a source file inside one sound', () => {
    const repeated: StockMap = {
      ...MAP,
      sounds: { 'a.b': { category: 'ui', from: ['rpg:cloth1', 'rpg:cloth*'] } },
    };

    const files = resolveStockMap(repeated, AVAILABLE).sounds['a.b']?.files ?? [];

    expect(files.map((f) => f.source)).toEqual(['cloth1', 'cloth2']);
  });
});

describe('buildIndex', () => {
  it('produces the index the sample bank reads', () => {
    const index = buildIndex(resolveStockMap(MAP, AVAILABLE).sounds);

    expect(index).toEqual({
      version: 1,
      sounds: {
        'step.rock': {
          files: ['step_rock_1.mp3', 'step_rock_2.mp3'],
          category: 'foley',
          gain: 0.8,
          loop: false,
        },
        'step.cloth': {
          files: ['step_cloth_1.mp3', 'step_cloth_2.mp3', 'step_cloth_3.mp3'],
          category: 'foley',
          gain: 1,
          loop: false,
        },
        'ship.hit': { files: ['ship_hit_1.mp3'], category: 'ship', gain: 1, loop: true },
      },
    });
  });
});

describe('buildCredits', () => {
  it('lists the origin and licence of every file that ships', () => {
    const credits = buildCredits(resolveStockMap(MAP, AVAILABLE).sounds, PACKS);

    expect(credits).toContainEqual({
      file: 'step_rock_1.mp3',
      sound: 'step.rock',
      pack: 'Impact Sounds',
      source: 'footstep_concrete_000',
      author: 'Kenney',
      license: 'CC0',
      url: 'https://kenney.nl/assets/impact-sounds',
    });
    expect(credits).toHaveLength(6);
  });
});
