import { describe, expect, it } from 'vitest';
import { talkLines, TALK_TOPICS } from '../../src/game/endingTalk';

const none: ReadonlySet<string> = new Set();

describe('what the Teacher reads in your notebook (plan de los finales, F4)', () => {
  it('always opens with her old phrase, warns about the energy and believes you, even knowing nothing', () => {
    const lines = talkLines(none);

    expect(lines[0]).toContain('Vuelve a contármelo todo');
    expect(lines.some((line) => line.includes('tiempo prestado'))).toBe(true);
    expect(lines.at(-1)).toContain('Directora');
  });

  it('adds one line per topic you know, in order, and none of the ones you do not', () => {
    const every = new Set(TALK_TOPICS.flatMap((topic) => topic.facts));
    const first = TALK_TOPICS[0];
    if (!first) throw new Error('sin temas');

    expect(talkLines(every).length).toBe(talkLines(none).length + TALK_TOPICS.length);
    const some = talkLines(new Set(first.facts));
    expect(some.length).toBe(talkLines(none).length + 1);
    expect(some).toContain(first.line);
  });

  it('counts a topic as known with any one of its facts', () => {
    for (const topic of TALK_TOPICS) {
      for (const fact of topic.facts) {
        expect(talkLines(new Set([fact]))).toContain(topic.line);
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
