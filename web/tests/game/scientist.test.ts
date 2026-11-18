// La científica en su cámara de frío (E4, plan de finales §3.3): calentar el lecho por pasos y sin prisa la despierta;
// después habla, y lo que dice depende de lo que sabes de él y de si llevas el Contrapeso. No recuerda los ciclos.
import { describe, expect, it } from 'vitest';
import {
  COLD_BED,
  COLD_BED_SOURCE,
  SCIENTIST_TALKS,
  scientistGone,
  bedWarmth,
  frozenBed,
  heardFromHim,
  scientistTalk,
  warmBed,
  type ColdBedState,
} from '../../src/game/scientist';

/** Calienta paso a paso, esperando lo justo entre uno y otro. */
function warmPatiently(state: ColdBedState, steps: number, start = 0): ColdBedState {
  let s = state;
  for (let k = 0; k < steps; k++) s = warmBed(s, start + k * COLD_BED.settle).state;
  return s;
}

describe('the cold bed', () => {
  it('starts frozen and cold every cycle', () => {
    const bed = frozenBed();
    expect(bed.stage).toBe(0);
    expect(bed.awake).toBe(false);
    expect(bedWarmth(bed, 100)).toBe(0);
  });

  it('warms one step at a time when you wait for each one to settle', () => {
    const first = warmBed(frozenBed(), 10);
    expect(first.result).toBe('warmer');
    expect(first.state.stage).toBe(1);
    const second = warmBed(first.state, 10 + COLD_BED.settle);
    expect(second.result).toBe('warmer');
    expect(second.state.stage).toBe(2);
  });

  it('closes the frost again if you hurry: one step back', () => {
    const two = warmPatiently(frozenBed(), 2);
    const hurried = warmBed(two, COLD_BED.settle + 0.5);
    expect(hurried.result).toBe('too_soon');
    expect(hurried.state.stage).toBe(1);
    // Y hay que volver a esperar desde ahí.
    expect(warmBed(hurried.state, COLD_BED.settle + 1).result).toBe('too_soon');
    expect(warmBed(hurried.state, 2 * COLD_BED.settle + 0.5).result).toBe('warmer');
  });

  it('never goes below cold when hurried from the first step', () => {
    const one = warmBed(frozenBed(), 0).state;
    const hurried = warmBed(one, 0.1);
    expect(hurried.state.stage).toBe(0);
  });

  it('wakes her on the last step, and then there is nothing left to warm', () => {
    const almost = warmPatiently(frozenBed(), COLD_BED.steps - 1);
    const last = warmBed(almost, (COLD_BED.steps - 1) * COLD_BED.settle);
    expect(last.result).toBe('awake');
    expect(last.state.awake).toBe(true);
    expect(last.state.stage).toBe(COLD_BED.steps);
    expect(warmBed(last.state, 999).result).toBe('idle');
    expect(warmBed(last.state, 999).state).toBe(last.state);
  });

  it('shows the warmth rising slowly towards each step', () => {
    const one = warmBed(frozenBed(), 10).state;
    expect(bedWarmth(one, 10)).toBe(0);
    expect(bedWarmth(one, 10 + COLD_BED.settle / 2)).toBeCloseTo(0.5 / COLD_BED.steps, 6);
    expect(bedWarmth(one, 10 + COLD_BED.settle * 3)).toBeCloseTo(1 / COLD_BED.steps, 6);
    const back = warmBed(warmBed(one, 10 + COLD_BED.settle).state, 10 + COLD_BED.settle + 0.2);
    // Al cerrarse la escarcha, el calor baja (de dos pasos a uno) poco a poco.
    expect(bedWarmth(back.state, 10 + COLD_BED.settle + 0.2)).toBeCloseTo(
      bedWarmth(warmBed(one, 10 + COLD_BED.settle).state, 10 + COLD_BED.settle + 0.2),
      6,
    );
    expect(bedWarmth(back.state, 1000)).toBeCloseTo(1 / COLD_BED.steps, 6);
  });

  it('ignores odd times', () => {
    expect(warmBed(frozenBed(), Number.NaN).state.stage).toBe(1);
    expect(bedWarmth(frozenBed(), Number.NaN)).toBe(0);
  });
});

describe('what she says', () => {
  it('asks the date and who you are when you know nothing of him', () => {
    expect(scientistTalk({ opened: new Set(['lab.pizarra']), carrying: false })).toBe(
      SCIENTIST_TALKS.first,
    );
  });

  it('asks small things about him once you have talked with him', () => {
    const opened = new Set(['taller.centro.esceptico']);
    expect(heardFromHim(opened)).toBe(true);
    expect(scientistTalk({ opened, carrying: false })).toBe(SCIENTIST_TALKS.news);
  });

  it('asks you to take the Counterweight to him when you carry it', () => {
    expect(scientistTalk({ opened: new Set(), carrying: true })).toBe(SCIENTIST_TALKS.errand);
    expect(scientistTalk({ opened: new Set(['x.esceptico']), carrying: true })).toBe(
      SCIENTIST_TALKS.errand,
    );
  });

  it('gives each talk the portrait suffix of the scientist', () => {
    for (const id of Object.values(SCIENTIST_TALKS)) expect(id.endsWith('.cientifica')).toBe(true);
  });
});

describe('which sources can be read', () => {
  it('hides every talk while she sleeps, and offers the bed', () => {
    for (const id of Object.values(SCIENTIST_TALKS)) {
      expect(scientistGone(id, false, SCIENTIST_TALKS.first)).toBe(true);
    }
    expect(scientistGone(COLD_BED_SOURCE, false, SCIENTIST_TALKS.first)).toBe(false);
  });

  it('awake, offers only the talk of the moment and no longer the bed', () => {
    const talk = SCIENTIST_TALKS.news;
    expect(scientistGone(talk, true, talk)).toBe(false);
    expect(scientistGone(SCIENTIST_TALKS.first, true, talk)).toBe(true);
    expect(scientistGone(SCIENTIST_TALKS.errand, true, talk)).toBe(true);
    expect(scientistGone(COLD_BED_SOURCE, true, talk)).toBe(true);
  });

  it('leaves every other source alone', () => {
    expect(scientistGone('lab.pizarra', false, SCIENTIST_TALKS.first)).toBe(false);
    expect(scientistGone('taller.saludo.esceptico', true, SCIENTIST_TALKS.first)).toBe(false);
  });
});
