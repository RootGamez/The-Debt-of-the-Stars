import { describe, expect, it } from 'vitest';
import { talkScript, TALK_TOPICS } from '../../src/game/endingTalk';
import {
  beatAt,
  EARLIER_PHASES,
  earlierTimeline,
  knownPage,
  lineSeconds,
  meetSpot,
  NEST,
  phaseAt,
  topicPage,
  type EarlierTimeline,
} from '../../src/game/homeEarlier';
import type { NotebookPage } from '../../src/registry/notebookPages';

/** Un cuaderno pequeño: tapa, guarda, «Lo que sé», una pregunta por tema conocido y la contratapa. */
function notebook(known: readonly string[]): NotebookPage[] {
  const thread = (threadId: string, ids: readonly string[]): NotebookPage => ({
    kind: 'thread',
    threadId,
    question: `¿${threadId}?`,
    known: ids.length,
    total: 4,
    entries: ids.map((id) => ({ kind: 'fact', id, line: id, related: [], fresh: false })),
    part: 0,
  });
  const pages: NotebookPage[] = [
    { kind: 'cover' },
    { kind: 'flyleaf' },
    { kind: 'known', conclusions: ['La deuda es de tiempo'], totalFacts: known.length, part: 0 },
    thread('otra', ['umbral.reloj']),
  ];
  for (const topic of TALK_TOPICS) {
    const ids = topic.facts.filter((fact) => known.includes(fact));
    if (ids.length > 0) pages.push(thread(topic.id, ids));
  }
  if (pages.length % 2 === 0) pages.push({ kind: 'blank' });
  pages.push({ kind: 'back' });
  return pages;
}

const everything = TALK_TOPICS.flatMap((topic) => topic.facts);
function timelineOf(known: readonly string[]): EarlierTimeline {
  const set = new Set(known);
  return earlierTimeline(talkScript(set), notebook(known), set);
}

describe('the arrival of the good ending: where everyone is (F4)', () => {
  it('lands the ship on the nest with the ladder going down to the south, onto the ground', () => {
    expect(NEST.ship).toEqual([0, 0, 3]);
    expect(NEST.ladderTop[2]).toBeGreaterThan(1.5);
    expect(NEST.ladderBottom[2]).toBeCloseTo(0, 6);
    expect(NEST.ladderFoot[2]).toBeCloseTo(0, 6);
    expect(NEST.ladderBottom[1]).toBeLessThan(NEST.ladderTop[1]);
    expect(NEST.ladderFoot[1]).toBeLessThan(NEST.ladderBottom[1]);
  });

  it('puts the Teacher outside the platform and you in front of her, closer to the ship', () => {
    expect(Math.hypot(NEST.maestra[0], NEST.maestra[1])).toBeGreaterThan(5.6);
    const meet = meetSpot();
    expect(Math.hypot(meet[0] - NEST.maestra[0], meet[1] - NEST.maestra[1])).toBeCloseTo(
      NEST.meetGap,
      6,
    );
    const toFoot = (p: readonly number[]): number =>
      Math.hypot((p[0] ?? 0) - NEST.ladderFoot[0], (p[1] ?? 0) - NEST.ladderFoot[1]);
    expect(toFoot(meet)).toBeLessThan(toFoot(NEST.maestra));
  });

  it('keeps the watchers away from the nest and from each other', () => {
    for (const [i, a] of NEST.watchers.entries()) {
      expect(Math.hypot(a[0], a[1])).toBeGreaterThan(9);
      for (const b of NEST.watchers.slice(i + 1)) {
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(0.9);
      }
    }
  });
});

describe('the chronology of the scene (F4)', () => {
  it('goes through every phase in order, without gaps, from the arrival to the way out', () => {
    for (const known of [[], everything]) {
      const timeline = timelineOf(known);
      expect(timeline.phases.map((span) => span.phase)).toEqual(EARLIER_PHASES);
      timeline.phases.forEach((span, i) => {
        expect(span.end).toBeGreaterThan(span.start);
        if (i > 0) expect(span.start).toBe(timeline.phases[i - 1]?.end);
      });
      expect(timeline.phases.at(-1)?.end).toBe(timeline.duration);
      expect(phaseAt(timeline, 0)).toBe('llegada');
      expect(phaseAt(timeline, timeline.duration + 1)).toBe('salida');
    }
  });

  it('lands, opens the hatch, comes down the ladder and walks to her, in that order', () => {
    const { marks } = timelineOf(everything);
    expect(marks.touchdown).toBeLessThan(marks.hatch);
    expect(marks.hatch).toBeLessThan(marks.ladderStart);
    expect(marks.ladderStart).toBeLessThan(marks.ladderEnd);
    expect(marks.ladderEnd).toBeLessThan(marks.walkEnd);
    expect(marks.walkEnd).toBeLessThan(marks.handOver);
    expect(marks.handOver).toBeLessThan(marks.bookOpen);
    expect(marks.bookOpen).toBeLessThan(marks.bookClose);
    expect(marks.bookClose).toBeLessThan(marks.lookUp);
    expect(marks.lookUp).toBeLessThan(marks.fadeStart);
  });

  it('places every line of the script once, in order, without overlapping and long enough to read', () => {
    for (const known of [[], everything, [TALK_TOPICS[2]?.facts[0] ?? '']]) {
      const set = new Set(known);
      const script = talkScript(set);
      const { lines, duration } = earlierTimeline(script, notebook(known), set);
      expect(lines.map((line) => line.text)).toEqual(script.map((line) => line.text));
      lines.forEach((line, i) => {
        expect(line.end - line.start).toBeCloseTo(lineSeconds(line.text), 6);
        if (i > 0) expect(line.start).toBeGreaterThan(lines[i - 1]?.end ?? 0);
      });
      expect(lines.at(-1)?.end).toBeLessThan(duration);
    }
  });

  it('asks for the notebook before reading it and warns her after reading it', () => {
    const timeline = timelineOf(everything);
    const opening = timeline.lines.find((line) => line.part === 'apertura');
    const topics = timeline.lines.filter((line) => line.part === 'tema');
    const warning = timeline.lines.find((line) => line.part === 'advertencia');
    expect(opening?.end).toBeLessThan(timeline.marks.handOver);
    expect(topics[0]?.start).toBeGreaterThan(timeline.marks.bookOpen);
    expect(warning?.start).toBeGreaterThan(topics.at(-1)?.end ?? 0);
    expect(phaseAt(timeline, warning?.start ?? 0)).toBe('advertencia');
  });

  it('grows with what you know: one more reading beat per topic', () => {
    const none = timelineOf([]);
    const all = timelineOf(everything);
    expect(none.beats).toHaveLength(1);
    expect(all.beats).toHaveLength(1 + TALK_TOPICS.length);
    expect(all.duration).toBeGreaterThan(none.duration);
    expect(none.duration).toBeGreaterThan(60);
    expect(all.duration).toBeLessThan(180);
  });
});

describe('the pages of your own notebook that she reads (F4)', () => {
  it('opens on «Lo que sé» and then turns to the question where each topic is written', () => {
    const pages = notebook(everything);
    const timeline = earlierTimeline(talkScript(new Set(everything)), pages, new Set(everything));
    expect(timeline.beats[0]?.page).toBe(knownPage(pages));
    for (const item of timeline.beats.slice(1)) {
      const page = pages[item.page];
      expect(page?.kind).toBe('thread');
      if (page?.kind === 'thread') expect(page.threadId).toBe(item.topic);
    }
  });

  it('never shows a page with facts you do not know', () => {
    const known = [TALK_TOPICS[0]?.facts[1] ?? ''];
    const pages = notebook(known);
    const timeline = earlierTimeline(talkScript(new Set(known)), pages, new Set(known));
    for (const item of timeline.beats) {
      const page = pages[item.page];
      if (page?.kind !== 'thread') continue;
      for (const entry of page.entries) expect(known).toContain(entry.id);
    }
  });

  it('falls back to «Lo que sé» when a topic is not written on any question', () => {
    const pages = notebook([]);
    expect(topicPage(pages, ['deuda.es_de_tiempo'], knownPage(pages))).toBe(knownPage(pages));
    expect(knownPage([{ kind: 'cover' }, { kind: 'flyleaf' }, { kind: 'back' }])).toBe(2);
  });

  it('says which spread and which side each page is on', () => {
    const timeline = timelineOf(everything);
    for (const item of timeline.beats) {
      expect(item.side).toBe(item.page % 2 === 1 ? 'left' : 'right');
      expect(item.spread).toBe(Math.ceil(item.page / 2));
    }
    expect(beatAt(timeline, timeline.marks.handOver - 0.1)).toBeUndefined();
    expect(beatAt(timeline, timeline.marks.bookOpen)).toBe(timeline.beats[0]);
    const last = timeline.beats.at(-1);
    expect(beatAt(timeline, (last?.start ?? 0) + 0.1)).toBe(last);
  });
});
