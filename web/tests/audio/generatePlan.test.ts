import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CREDITS_PER_SECOND,
  budgetLeft,
  estimateCredits,
  mergeIndex,
  planJobs,
  rawName,
  recordSpend,
  type GenerateManifest,
  type Ledger,
} from '../../scripts/audio/generatePlan';

const MANIFEST: GenerateManifest = {
  model: 'eleven_text_to_sound_v2',
  sounds: {
    'wormhole.cross': {
      category: 'cosmos',
      gain: 0.9,
      duration: 2.5,
      variants: 2,
      prompt: 'a whoosh',
    },
    'wormhole.idle': {
      category: 'cosmos',
      loop: true,
      duration: 6,
      variants: 1,
      prompt: 'a hum',
      lowpass: 4000,
    },
  },
};

const LEDGER: Ledger = { budget: 15000, spent: 0, entries: [] };

describe('estimateCredits', () => {
  it('charges by the seconds asked for', () => {
    expect(estimateCredits(2.5, DEFAULT_CREDITS_PER_SECOND)).toBe(100);
    expect(estimateCredits(6, 40)).toBe(240);
  });

  it('uses a rate measured from a real generation', () => {
    expect(estimateCredits(4, 25)).toBe(100);
  });

  it('never charges less than a credit', () => {
    expect(estimateCredits(0.01, 40)).toBe(1);
  });
});

describe('rawName', () => {
  it('turns an id and a variant into a file name', () => {
    expect(rawName('wormhole.cross', 2)).toBe('wormhole_cross_2.mp3');
  });
});

describe('planJobs', () => {
  it('lists one job per variant, in the order of the manifest', () => {
    const { jobs } = planJobs(MANIFEST, new Set(), 40);

    expect(jobs.map((j) => j.file)).toEqual([
      'wormhole_cross_1.mp3',
      'wormhole_cross_2.mp3',
      'wormhole_idle_1.mp3',
    ]);
    expect(jobs[2]).toMatchObject({ id: 'wormhole.idle', loop: true, duration: 6, credits: 240 });
  });

  it('skips what is already generated, so it never pays twice', () => {
    const { jobs } = planJobs(MANIFEST, new Set(['wormhole_cross_1.mp3']), 40);

    expect(jobs.map((j) => j.file)).toEqual(['wormhole_cross_2.mp3', 'wormhole_idle_1.mp3']);
  });

  it('adds up the estimate', () => {
    expect(planJobs(MANIFEST, new Set(), 40).estimate).toBe(100 + 100 + 240);
  });

  it('can be limited to some sounds', () => {
    const { jobs } = planJobs(MANIFEST, new Set(), 40, { only: ['wormhole.idle'] });

    expect(jobs.map((j) => j.id)).toEqual(['wormhole.idle']);
  });

  it('can be limited to the first jobs', () => {
    const { jobs, estimate } = planJobs(MANIFEST, new Set(), 40, { limit: 1 });

    expect(jobs).toHaveLength(1);
    expect(estimate).toBe(100);
  });
});

describe('the ledger', () => {
  it('tells how much of the budget is left', () => {
    expect(budgetLeft({ ...LEDGER, spent: 4000 })).toBe(11000);
    expect(budgetLeft({ ...LEDGER, spent: 99999 })).toBe(0);
  });

  it('records a spend without touching the old ledger', () => {
    const next = recordSpend(LEDGER, { id: 'a', file: 'a_1.mp3', credits: 80, at: '2026-11-11' });

    expect(next.spent).toBe(80);
    expect(next.entries).toHaveLength(1);
    expect(LEDGER.spent).toBe(0);
    expect(LEDGER.entries).toHaveLength(0);
  });
});

describe('mergeIndex', () => {
  const existing = {
    version: 1 as const,
    sounds: {
      'step.rock': { files: ['step_rock_1.mp3'], category: 'foley', gain: 1, loop: false },
      'old.thing': { files: ['old_1.mp3'], category: 'ui', gain: 1, loop: false },
    },
  };

  it('drops the sounds the producer owned before and adds its new ones', () => {
    const merged = mergeIndex(existing, ['old.thing'], {
      'new.thing': { files: ['new_1.mp3'], category: 'ship', gain: 1, loop: false },
    });

    expect(Object.keys(merged.sounds).sort()).toEqual(['new.thing', 'step.rock']);
  });

  it('keeps what belongs to someone else', () => {
    const merged = mergeIndex(existing, [], {});

    expect(merged.sounds['step.rock']).toEqual(existing.sounds['step.rock']);
    expect(merged.sounds['old.thing']).toBeDefined();
  });

  it('lets a producer replace its own sound', () => {
    const merged = mergeIndex(existing, ['step.rock'], {
      'step.rock': { files: ['step_rock_9.mp3'], category: 'foley', gain: 1, loop: false },
    });

    expect(merged.sounds['step.rock']?.files).toEqual(['step_rock_9.mp3']);
  });

  it('copes with no index yet', () => {
    expect(mergeIndex(undefined, [], {}).sounds).toEqual({});
  });
});
