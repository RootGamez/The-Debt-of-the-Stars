import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../src/cinematic/cameraTrack';
import { cameraAt, trackValue, validateCinematic } from '../../src/cinematic/timeline';
import { talkScript, TALK_TOPICS } from '../../src/game/endingTalk';
import { earlierTimeline, NEST } from '../../src/game/homeEarlier';
import { pathPoint } from '../../src/game/homeEarlierMotion';
import {
  arrivalPath,
  bookInHands,
  DEFAULT_SKY,
  earlierCinematic,
  insertAt,
  maestraEye,
  maestraFacing,
  pageCenter,
} from '../../src/game/homeEarlierScene';
import type { NotebookPage } from '../../src/registry/notebookPages';

const everything = new Set(TALK_TOPICS.flatMap((topic) => topic.facts));
/** Un cuaderno con «Lo que sé» y una pregunta por tema, cada uno en su doble página. */
function notebook(known: ReadonlySet<string>): NotebookPage[] {
  return [
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
        entries: topic.facts.map((id) => ({
          kind: 'fact',
          id,
          line: id,
          related: [],
          fresh: false,
        })),
        part: 0,
      },
      { kind: 'blank' },
    ]),
    { kind: 'back' },
  ];
}
const sceneFor = (known: ReadonlySet<string>) => {
  const timeline = earlierTimeline(talkScript(known), notebook(known), known);
  return { timeline, scene: earlierCinematic(timeline) };
};
const full = sceneFor(everything);

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3): number => Math.hypot(...a);
const unit = (a: Vec3): Vec3 => {
  const l = length(a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

describe('the nest scene of the good ending (F4)', () => {
  it('is a valid cinematic whatever you know', () => {
    const some = new Set(TALK_TOPICS[1]?.facts.slice(0, 1));
    for (const known of [everything, some, new Set<string>()]) {
      expect(validateCinematic(sceneFor(known).scene)).toEqual([]);
    }
  });

  it('says every line of the talk, in order and on time', () => {
    const { timeline, scene } = full;
    expect(scene.lines.map((line) => line.text)).toEqual(timeline.lines.map((line) => line.text));
    expect(scene.lines.map((line) => line.speaker)).toEqual(
      timeline.lines.map((line) => line.speaker),
    );
    expect(scene.duration).toBe(timeline.duration);
  });

  it('shows the pages of your notebook from her eyes while she reads each topic', () => {
    const { timeline, scene } = full;
    timeline.beats.forEach((beat, i) => {
      const insert = scene.shots.find((shot) => shot.id === `pagina-${i}`);
      expect(insert, `pagina-${i}`).toBeDefined();
      if (!insert) return;
      const last = insert.keys.at(-1);
      if (!last) return;
      const page = pageCenter(bookInHands(), beat.side);
      const toPage = unit(sub(page, last.pos));
      const looking = unit(sub(last.look, last.pos));
      expect(dot(toPage, looking)).toBeGreaterThan(0.999);
      expect(length(sub(last.pos, maestraEye()))).toBeLessThan(0.2);
      expect(insertAt(scene, (insert.start + insert.end) / 2)).toBe(true);
    });
    expect(insertAt(scene, 1)).toBe(false);
  });

  it('closes the vignette on the pages and opens it again for the faces', () => {
    const { scene } = full;
    for (const shot of scene.shots) {
      const middle = (shot.start + shot.end) / 2;
      const haze = trackValue(scene, 'haze', middle, 0);
      if (shot.id.startsWith('pagina-')) expect(haze).toBeGreaterThan(0.5);
      else expect(haze).toBe(0);
    }
  });

  it('starts looking at the bite on the Moon from near it and ends looking at the Moon above the nest', () => {
    const { scene } = full;
    const start = cameraAt(scene, 0);
    // Fuera de la Luna, pero lo bastante cerca para que llene buena parte del cuadro (más de 8° de radio).
    const fromMoon = length(sub(start.pos, DEFAULT_SKY.moon));
    expect(fromMoon).toBeGreaterThan(DEFAULT_SKY.moonRadius + 20);
    expect(fromMoon).toBeLessThan(DEFAULT_SKY.moonRadius / Math.sin(0.14));
    const looking = unit(sub(start.look, start.pos));
    expect(dot(looking, unit(sub(DEFAULT_SKY.bite, start.pos)))).toBeGreaterThan(0.99);
    const end = cameraAt(scene, scene.duration);
    expect(end.pos[2]).toBeGreaterThan(4);
    const toMoon = unit(sub(DEFAULT_SKY.moon, end.pos));
    expect(dot(unit(sub(end.look, end.pos)), toMoon)).toBeGreaterThan(0.5);
  });

  it('fades in from black and out to black, with the music from the start', () => {
    const { scene } = full;
    expect(trackValue(scene, 'fade', 0, 0)).toBe(1);
    expect(trackValue(scene, 'fade', 5, 0)).toBe(0);
    expect(trackValue(scene, 'fade', scene.duration, 0)).toBe(1);
    expect(scene.cues.map((cue) => cue.id)).toContain('music.scene');
  });
});

describe('where she holds your notebook (F4)', () => {
  it('holds it in front of her, at arm reach, turned to her eyes, with the right page on her right', () => {
    const book = bookInHands();
    const her = maestraFacing();
    const toEye = unit(sub(maestraEye(), book.center));
    expect(dot(book.z, toEye)).toBeCloseTo(1, 6);
    expect(dot(book.x, her.right)).toBeGreaterThan(0.99);
    expect(dot(book.y, her.forward)).toBeGreaterThan(0.8);
    const ahead = dot(sub(book.center, her.at), her.forward);
    expect(ahead).toBeGreaterThan(0.3);
    expect(ahead).toBeLessThan(0.6);
    expect(length(sub(maestraEye(), book.center))).toBeLessThan(0.65);
  });
});

describe('the way home of the Albatros II (F4)', () => {
  it('leaves from above the bite, clear of the Moon, and comes down straight into the nest', () => {
    const path = arrivalPath(DEFAULT_SKY);
    expect(length(sub(path.from, DEFAULT_SKY.moon))).toBeGreaterThan(DEFAULT_SKY.moonRadius + 10);
    for (let s = 0; s <= 1; s += 0.05) {
      const p = pathPoint(path, s);
      expect(length(sub(p, DEFAULT_SKY.moon))).toBeGreaterThan(DEFAULT_SKY.moonRadius + 5);
    }
    expect(path.via[1][0]).toBeCloseTo(NEST.ship[0], 6);
    expect(path.via[1][1]).toBeCloseTo(NEST.ship[1], 6);
    expect(path.via[1][2]).toBeGreaterThan(NEST.ship[2] + 30);
  });
});
