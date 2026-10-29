import { describe, expect, it } from 'vitest';
import {
  absorptionWindow,
  activeAt,
  eventsBetween,
  parseChronology,
  triggersAsEvents,
  scaleChronology,
  cycleLengthFromQuery,
  quietChronology,
  type Chronology,
} from '../../src/core/timeline';
import { WorldDataError } from '../../src/worlds/markers';
import chronologyJson from '../../src/data/cronologia.json';
import { WORLD_IDS } from '../../src/worlds/worldSelection';

const valid = {
  duracion: 900,
  eventos: [
    { id: 'senales', t: 300, duracion: 600 },
    { id: 'pulso', t: 540, duracion: 6 },
    { id: 'boca', t: 600, duracion: 3, mundo: 'umbral' },
    { id: 'inicio', t: 0, duracion: 1 },
  ],
  absorcion: { umbral: [860, 885], cicatriz: [810, 825] },
  relojes: {
    cicatriz: [
      [0, 0.6],
      [810, 0.35],
    ],
  },
};

function chronology(): Chronology {
  return parseChronology(valid);
}

describe('parseChronology', () => {
  it('reads duration, events, absorption windows and clock curves', () => {
    const c = chronology();

    expect(c.duration).toBe(900);
    expect(c.events).toHaveLength(4);
    expect(c.absorption.umbral).toEqual([860, 885]);
    expect(c.clocks.cicatriz).toEqual([
      [0, 0.6],
      [810, 0.35],
    ]);
  });

  it('accepts the real chronology file of the game', () => {
    const c = parseChronology(chronologyJson);

    expect(c.duration).toBe(900);
    expect(absorptionWindow(c, 'umbral')).toBeDefined();
  });

  it.each([
    ['a non-positive duration', { ...valid, duracion: 0 }, /duracion/],
    ['an event without id', { ...valid, eventos: [{ t: 1, duracion: 1 }] }, /id/],
    ['an event outside the loop', { ...valid, eventos: [{ id: 'x', t: 950, duracion: 1 }] }, /x/],
    ['repeated event ids', { ...valid, eventos: [valid.eventos[0], valid.eventos[0]] }, /senales/],
    [
      'an absorption that ends before it starts',
      { ...valid, absorcion: { umbral: [885, 860] } },
      /umbral/,
    ],
    [
      'a clock curve with a non-positive rate',
      { ...valid, relojes: { cicatriz: [[0, 0]] } },
      /cicatriz/,
    ],
    [
      'a clock curve out of order',
      {
        ...valid,
        relojes: {
          cicatriz: [
            [10, 0.5],
            [5, 0.4],
          ],
        },
      },
      /cicatriz/,
    ],
    ['something that is not an object', 'hola', /cronología/],
  ])('rejects %s', (_name, raw, message) => {
    expect(() => parseChronology(raw)).toThrow(WorldDataError);
    expect(() => parseChronology(raw)).toThrow(message);
  });
});

describe('eventsBetween', () => {
  it('reports events that start inside the interval', () => {
    const changes = eventsBetween(chronology().events, 530, 545, 'umbral');

    expect(changes.map((c) => `${c.kind}:${c.event.id}`)).toEqual(['start:pulso']);
  });

  it('reports events that end inside the interval', () => {
    const changes = eventsBetween(chronology().events, 545, 547, 'umbral');

    expect(changes.map((c) => `${c.kind}:${c.event.id}`)).toEqual(['end:pulso']);
  });

  it('includes events at the very start of the loop on the first interval', () => {
    const ids = eventsBetween(chronology().events, 0, 0.016, 'umbral').map((c) => c.event.id);

    expect(ids).toContain('inicio');
  });

  it('never reports the same change twice across consecutive intervals', () => {
    const events = chronology().events;
    const first = eventsBetween(events, 590, 600, 'umbral');
    const second = eventsBetween(events, 600, 610, 'umbral');

    const starts = [...first, ...second].filter((c) => c.kind === 'start' && c.event.id === 'boca');
    expect(starts).toHaveLength(1);
  });

  it('does not lose events when a long frame skips over them, and keeps them in time order', () => {
    const changes = eventsBetween(chronology().events, 250, 700, 'umbral');

    expect(changes.map((c) => `${c.kind}:${c.event.id}`)).toEqual([
      'start:senales',
      'start:pulso',
      'end:pulso',
      'start:boca',
      'end:boca',
    ]);
  });

  it('ignores events that belong to another world', () => {
    const ids = eventsBetween(chronology().events, 590, 610, 'archivo').map((c) => c.event.id);

    expect(ids).not.toContain('boca');
  });
});

describe('activeAt', () => {
  it('lists the events happening at a moment, for this world and global ones', () => {
    const ids = activeAt(chronology().events, 601, 'umbral').map((e) => e.id);

    expect(ids.sort()).toEqual(['boca', 'senales']);
  });
});

describe('triggersAsEvents', () => {
  it('turns timed TRIG_ markers into events of this world', () => {
    const events = triggersAsEvents(
      [
        { event: 'boca_destello', loopTime: 600, duration: 3 },
        { event: 'mirador', loopTime: undefined, duration: undefined },
      ],
      'umbral',
    );

    expect(events).toEqual([{ id: 'boca_destello', t: 600, duration: 3, world: 'umbral' }]);
  });
});

describe('absorptionWindow', () => {
  it('returns the window for worlds that are absorbed and nothing for the others', () => {
    expect(absorptionWindow(chronology(), 'cicatriz')).toEqual([810, 825]);
    expect(absorptionWindow(chronology(), 'hogar')).toBeUndefined();
  });
});

describe('scaleChronology', () => {
  it('shrinks the whole loop proportionally for quick tests', () => {
    const short = scaleChronology(chronology(), 90); // 900 → 90: todo a la décima parte

    expect(short.duration).toBe(90);
    const pulse = short.events.find((e) => e.id === 'pulso');
    expect(pulse?.t).toBeCloseTo(54);
    expect(pulse?.duration).toBeCloseTo(0.6);
    expect(short.absorption.umbral).toEqual([86, 88.5]);
    expect(short.clocks.cicatriz).toEqual([
      [0, 0.6],
      [81, 0.35],
    ]);
  });

  it('does not change the original', () => {
    const original = chronology();

    scaleChronology(original, 90);

    expect(original.duration).toBe(900);
  });
});

describe('cycleLengthFromQuery', () => {
  it('reads ?ciclo= only together with ?debug', () => {
    expect(cycleLengthFromQuery('?debug&ciclo=60')).toBe(60);
    expect(cycleLengthFromQuery('?ciclo=60')).toBeUndefined();
  });

  it('ignores values that are not a sensible number of seconds', () => {
    expect(cycleLengthFromQuery('?debug&ciclo=abc')).toBeUndefined();
    expect(cycleLengthFromQuery('?debug&ciclo=-5')).toBeUndefined();
    expect(cycleLengthFromQuery('?debug&ciclo=999999')).toBeUndefined();
  });
});

describe('stricter chronology validation (review fixes)', () => {
  it('rejects an absorption window outside the loop', () => {
    expect(() => parseChronology({ ...valid, absorcion: { umbral: [860, 950] } })).toThrow(
      /umbral/,
    );
  });

  it('rejects world names it does not know when given the list of worlds (typos)', () => {
    const typo = { ...valid, absorcion: { umbrall: [860, 885] } };

    expect(() => parseChronology(typo, ['umbral', 'cicatriz'])).toThrow(/umbrall/);
    expect(() =>
      parseChronology({ ...valid, relojes: { cicatrix: [[0, 1]] } }, ['umbral', 'cicatriz']),
    ).toThrow(/cicatrix/);
    expect(() =>
      parseChronology({ ...valid, eventos: [{ id: 'x', t: 1, duracion: 1, mundo: 'luns' }] }, [
        'luna',
      ]),
    ).toThrow(/luns/);
  });

  it('accepts the real chronology with the eight known worlds', () => {
    expect(() => parseChronology(chronologyJson, WORLD_IDS)).not.toThrow();
  });
});

describe('quietChronology (at home, in the prologue)', () => {
  it('has nothing happening: no events, no absorption, no clocks that change', () => {
    const quiet = quietChronology();

    expect(quiet.events).toEqual([]);
    expect(absorptionWindow(quiet, 'hogar')).toBeUndefined();
    expect(activeAt(quiet.events, 300, 'hogar')).toEqual([]);
    expect(quiet.duration).toBeGreaterThan(0);
  });
});
