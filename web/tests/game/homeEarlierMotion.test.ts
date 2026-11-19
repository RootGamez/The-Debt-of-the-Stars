import { describe, expect, it } from 'vitest';
import { talkScript, TALK_TOPICS } from '../../src/game/endingTalk';
import { earlierTimeline, meetSpot, NEST } from '../../src/game/homeEarlier';
import {
  bookAt,
  descentLeft,
  explorerAt,
  maestraAt,
  pathPoint,
  shipAt,
  type ArrivalPath,
} from '../../src/game/homeEarlierMotion';
import type { NotebookPage } from '../../src/registry/notebookPages';

const known = new Set(TALK_TOPICS.flatMap((topic) => topic.facts));
/** Un cuaderno con «Lo que sé» y una pregunta por tema, cada uno en su doble página. */
const pages: NotebookPage[] = [
  { kind: 'cover' },
  { kind: 'flyleaf' },
  { kind: 'known', conclusions: [], totalFacts: known.size, part: 0 },
  ...TALK_TOPICS.flatMap((topic): NotebookPage[] => [
    {
      kind: 'thread',
      threadId: topic.id,
      question: topic.id,
      known: topic.facts.length,
      total: topic.facts.length,
      entries: topic.facts.map((id) => ({ kind: 'fact', id, line: id, related: [], fresh: false })),
      part: 0,
    },
    { kind: 'blank' },
  ]),
  { kind: 'back' },
];
const timeline = earlierTimeline(talkScript(known), pages, known);
const { marks } = timeline;

describe('the ship coming home (F4)', () => {
  it('comes from high above and settles on the nest without overshooting', () => {
    const start = shipAt(timeline, 0);
    expect(start.position[2]).toBeGreaterThan(400);
    let previous = Infinity;
    for (let t = 0; t <= marks.touchdown; t += 0.25) {
      const height = shipAt(timeline, t).position[2];
      expect(height).toBeLessThanOrEqual(previous + 1e-9);
      expect(height).toBeGreaterThanOrEqual(NEST.ship[2] - 1e-9);
      previous = height;
    }
    expect(shipAt(timeline, marks.touchdown).position).toEqual(NEST.ship);
    expect(shipAt(timeline, marks.touchdown + 10).position).toEqual(NEST.ship);
    expect(descentLeft(timeline, marks.touchdown - 0.1)).toBeLessThan(0.01);
  });

  it('slows down at the end and straightens its bow to the north', () => {
    const fall = (t: number): number =>
      shipAt(timeline, t).position[2] - shipAt(timeline, t + 0.1).position[2];
    expect(fall(marks.touchdown - 0.3)).toBeLessThan(fall(1) / 50);
    expect(shipAt(timeline, marks.touchdown).yaw).toBe(0);
  });

  it('follows a curved path from the Moon and still comes down straight into the nest', () => {
    const path: ArrivalPath = {
      from: [-300, -320, 600],
      via: [
        [-200, -200, 520],
        [0, 0, 80],
      ],
    };
    expect(shipAt(timeline, 0, path).position).toEqual(path.from);
    expect(shipAt(timeline, marks.touchdown, path).position).toEqual(NEST.ship);
    const late = shipAt(timeline, marks.touchdown - 1.5, path).position;
    expect(Math.hypot(late[0] - NEST.ship[0], late[1] - NEST.ship[1])).toBeLessThan(0.2);
    expect(late[2]).toBeGreaterThan(NEST.ship[2]);
    expect(pathPoint(path, 0.5)[2]).toBeGreaterThan(80);
  });

  it('comes in gliding, not standing still, and never moves backwards along its path', () => {
    const along = (t: number): number => 1 - descentLeft(timeline, t);
    expect(along(0.5)).toBeGreaterThan(0.005);
    let previous = 0;
    for (let t = 0; t <= marks.touchdown; t += 0.25) {
      expect(along(t)).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = along(t);
    }
  });

  it('burns its lift jets while coming down, cuts them on landing and then opens the hatch', () => {
    expect(shipAt(timeline, marks.touchdown - 1).burn).toBeGreaterThan(0.9);
    expect(shipAt(timeline, marks.touchdown + 1).burn).toBe(0);
    expect(shipAt(timeline, marks.hatch - 0.01).hatch).toBe(0);
    expect(shipAt(timeline, marks.ladderStart).hatch).toBe(1);
  });
});

describe('you, coming down with the notebook (F4)', () => {
  it('stays inside the ship until the hatch is open, then comes down the ladder', () => {
    expect(explorerAt(timeline, marks.touchdown).visible).toBe(false);
    const top = explorerAt(timeline, marks.ladderStart);
    expect(top.visible).toBe(true);
    expect(top.position).toEqual(NEST.ladderTop);
    const middle = explorerAt(timeline, (marks.ladderStart + marks.ladderEnd) / 2);
    expect(middle.position[2]).toBeLessThan(NEST.ladderTop[2]);
    expect(middle.position[2]).toBeGreaterThan(0);
    expect(middle.speed).toBeGreaterThan(0);
  });

  it('walks to her and stops facing her, then holds out the notebook and lets it go', () => {
    const there = explorerAt(timeline, marks.walkEnd + 0.01);
    const meet = meetSpot();
    expect(there.position[0]).toBeCloseTo(meet[0], 6);
    expect(there.position[1]).toBeCloseTo(meet[1], 6);
    expect(there.speed).toBe(0);
    const towardHer = Math.atan2(NEST.maestra[0] - meet[0], NEST.maestra[1] - meet[1]);
    expect(Math.cos(there.heading - towardHer)).toBeCloseTo(1, 6);
    expect(explorerAt(timeline, marks.handOver - 0.3).offer).toBeGreaterThan(0.9);
    expect(explorerAt(timeline, marks.handOver - 0.3).holdsBook).toBe(true);
    expect(explorerAt(timeline, marks.handOver + 0.1).holdsBook).toBe(false);
    expect(explorerAt(timeline, marks.handOver + 2).offer).toBe(0);
  });
});

describe('the Teacher (F4)', () => {
  it('watches the ship land, then you, then your notebook, then the sky', () => {
    expect(maestraAt(timeline, 5).attention).toBe('nave');
    expect(maestraAt(timeline, marks.walkEnd).attention).toBe('explorador');
    expect(maestraAt(timeline, marks.bookOpen + 1).attention).toBe('cuaderno');
    expect(maestraAt(timeline, marks.bookOpen + 1).aim).toBe(0);
    expect(maestraAt(timeline, marks.lookUp + 2).attention).toBe('cielo');
  });

  it('holds out her hands for the notebook, reads with her head down and nods when she believes you', () => {
    expect(maestraAt(timeline, marks.handOver - 0.2).pose.armR.raise).toBeGreaterThan(1);
    const reading = maestraAt(timeline, marks.bookOpen + 1).pose;
    expect(reading.headPitch).toBeLessThan(-0.3);
    const nodding = maestraAt(timeline, marks.nod + 0.25).pose.headPitch;
    const still = maestraAt(timeline, marks.nod + 1.2).pose.headPitch;
    expect(nodding).toBeLessThan(still - 0.1);
    expect(maestraAt(timeline, marks.lookUp + 2).pose.headPitch).toBeGreaterThan(0.5);
  });

  it('stands turned toward the foot of the ladder', () => {
    const { heading } = maestraAt(timeline, 0);
    const toFoot = Math.atan2(
      NEST.ladderFoot[0] - NEST.maestra[0],
      NEST.ladderFoot[1] - NEST.maestra[1],
    );
    expect(heading).toBeCloseTo(toFoot, 6);
  });
});

describe('the notebook (F4)', () => {
  it('is yours and closed until you give it to her; she opens it and closes it at the end', () => {
    expect(bookAt(timeline, marks.handOver - 0.1)).toEqual({
      holder: 'explorador',
      open: 0,
      spread: 0,
    });
    expect(bookAt(timeline, marks.handOver + 0.1).holder).toBe('maestra');
    expect(bookAt(timeline, marks.bookOpen).open).toBe(1);
    expect(bookAt(timeline, marks.bookClose + 1.5).open).toBe(0);
  });

  it('shows the spread of each topic and turns a leaf between two different spreads', () => {
    for (const item of timeline.beats.slice(1)) {
      const mid = bookAt(timeline, item.start + 0.45);
      expect(mid.spread).toBe(item.spread);
      expect(mid.turning?.to).toBe(item.spread);
      expect(mid.turning?.progress).toBeCloseTo(0.5, 6);
      expect(bookAt(timeline, item.start + 1.2).turning).toBeUndefined();
    }
  });
});
