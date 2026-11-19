import { describe, expect, it } from 'vitest';
import { knownTopics, talkScript, TALK_TOPICS } from '../../src/game/endingTalk';

const none: ReadonlySet<string> = new Set();
const every: ReadonlySet<string> = new Set(TALK_TOPICS.flatMap((topic) => topic.facts));

describe('what the Teacher reads in your notebook (plan de los finales, F4)', () => {
  it('always greets, asks for the notebook with her old phrase, hears the warning and believes you', () => {
    const script = talkScript(none);
    const parts = script.map((line) => line.part);

    expect(parts[0]).toBe('saludo');
    expect(script.find((line) => line.part === 'apertura')?.text).toContain(
      'Vuelve a contármelo todo',
    );
    expect(
      script.some((line) => line.part === 'advertencia' && line.text.includes('tiempo prestado')),
    ).toBe(true);
    expect(
      script.some((line) => line.part === 'respuesta' && line.text.includes('Directora')),
    ).toBe(true);
    expect(parts.at(-1)).toBe('cierre');
  });

  it('keeps the order of the scene: greeting, opening, topics, warning, reply, closing', () => {
    const order = ['saludo', 'apertura', 'tema', 'advertencia', 'respuesta', 'cierre'];
    const ranks = talkScript(every).map((line) => order.indexOf(line.part));

    expect(ranks.every((rank, i) => i === 0 || rank >= (ranks[i - 1] ?? 0))).toBe(true);
  });

  it('gives you the warning and her the reading and the reply', () => {
    for (const line of talkScript(every)) {
      if (line.part === 'advertencia') expect(line.speaker).toBe('explorador');
      if (['apertura', 'tema', 'respuesta', 'cierre'].includes(line.part)) {
        expect(line.speaker).toBe('maestra');
      }
    }
  });

  it('adds one line per topic you know, in order, and none of the ones you do not', () => {
    const first = TALK_TOPICS[0];
    if (!first) throw new Error('sin temas');
    const topicsOf = (known: ReadonlySet<string>): string[] =>
      talkScript(known)
        .filter((line) => line.part === 'tema')
        .map((line) => line.topic ?? '');

    expect(topicsOf(none)).toEqual([]);
    expect(topicsOf(every)).toEqual(TALK_TOPICS.map((topic) => topic.id));
    expect(topicsOf(new Set(first.facts))).toEqual([first.id]);
    expect(talkScript(every).length).toBe(talkScript(none).length + TALK_TOPICS.length);
  });

  it('counts a topic as known with any one of its facts', () => {
    for (const topic of TALK_TOPICS) {
      for (const fact of topic.facts) {
        expect(knownTopics(new Set([fact])).map((found) => found.id)).toEqual([topic.id]);
      }
    }
  });

  it('covers the five things of the plan: the debt of time, the silence, the Great Departure, the two of them and the energy', () => {
    expect(TALK_TOPICS.map((topic) => topic.id)).toEqual([
      'deuda',
      'silencio',
      'partida',
      'ellos',
      'energia',
    ]);
  });
});
