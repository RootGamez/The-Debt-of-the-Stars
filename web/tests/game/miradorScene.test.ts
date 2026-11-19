import { describe, expect, it } from 'vitest';
import { cameraAt, cuesBetween, subtitleAt, validateCinematic } from '../../src/cinematic/timeline';
import type { Vec3 } from '../../src/cinematic/cameraTrack';
import { NEUTRAL_GESTURE } from '../../src/character/absentGestures';
import {
  gestureAt,
  GESTURE_FIELDS,
  gestureTrack,
  miradorCinematic,
  miradorRequested,
  SEATS,
} from '../../src/game/miradorScene';
import { EN } from '../../src/i18n/en';

const POINT: Vec3 = [0.15, 0.93, 0.34];
const scene = miradorCinematic(POINT);

describe('the Lookout scene (F3)', () => {
  it('is a valid script: shots one after another, lines in order, cues inside', () => {
    expect(validateCinematic(scene)).toEqual([]);
    expect(scene.duration).toBeGreaterThan(90);
    expect(scene.shots.length).toBeGreaterThanOrEqual(6);
  });

  it('opens on the still point and ends far behind them, looking at the Brasa', () => {
    const first = cameraAt(scene, 0);
    const toward = first.look.map((value, axis) => value - (first.pos[axis] ?? 0));
    const size = Math.hypot(...toward);
    expect((toward[2] ?? 0) / size).toBeCloseTo(POINT[2], 2);
    const last = cameraAt(scene, scene.duration);
    expect(last.pos[1]).toBeLessThan(-5);
    expect(last.look[1]).toBeGreaterThan(20);
  });

  it('keeps every camera above the platform and out of their bodies', () => {
    for (let time = 0; time <= scene.duration; time += 0.5) {
      const { pos, fov } = cameraAt(scene, time);
      expect(pos[2]).toBeGreaterThan(0);
      expect(fov).toBeGreaterThan(15);
      expect(fov).toBeLessThan(70);
      for (const seat of Object.values(SEATS)) {
        expect(Math.hypot(pos[0] - seat.x, pos[1] - seat.y)).toBeGreaterThan(0.7);
      }
    }
  });

  it('says little, with long silences, and nobody talks over the other', () => {
    expect(scene.lines.length).toBeLessThanOrEqual(8);
    const spoken = scene.lines.reduce((sum, line) => sum + line.end - line.start, 0);
    expect(spoken / scene.duration).toBeLessThan(0.3);
    expect(scene.lines.every((line) => ['cientifica', 'esceptico'].includes(line.speaker))).toBe(
      true,
    );
    expect(subtitleAt(scene, 10)).toBeUndefined();
  });

  it('keeps the tone: affection in things, never «te quiero», «amor», «perdón» or «amar»', () => {
    for (const line of scene.lines) {
      expect(line.text).not.toMatch(/te quiero|amor|perd[oó]n|\bam(ar|o|as|a)\b/i);
      const english = EN[line.text];
      expect(english, line.text).toBeDefined();
      expect(english).not.toMatch(/\blove|sorry|forgive/i);
    }
  });

  it('brings the music in after the black and gives the last shot the main theme', () => {
    expect(cuesBetween(scene, -1, 20).map((cue) => cue.id)).toEqual(['music.scene']);
    expect(cuesBetween(scene, 20, scene.duration, true).map((cue) => cue.id)).toEqual([
      'music.end',
    ]);
  });

  it('gives each of them their gestures, and he holds the cup the whole time', () => {
    for (const time of [0, 50, 75, 100, 129]) {
      expect(gestureAt(scene, 'esceptico', time).hold).toBe(1);
      expect(gestureAt(scene, 'cientifica', time).hold).toBe(0);
    }
    expect(gestureAt(scene, 'cientifica', 48).look).toBeLessThan(0); // lo mira a él, a su derecha
    expect(gestureAt(scene, 'cientifica', 75).lift).toBeGreaterThan(0.3); // el punto, arriba
    expect(gestureAt(scene, 'esceptico', 101).look).toBeGreaterThan(0.3); // la taza de ella, a su izquierda
    expect(gestureAt(scene, 'esceptico', 60).turn).toBeGreaterThan(
      gestureAt(scene, 'esceptico', 57).turn,
    );
    expect(Object.keys(NEUTRAL_GESTURE)).toEqual([...GESTURE_FIELDS]);
    expect(gestureTrack('cientifica', 'tilt')).toBe('cientifica.tilt');
  });
});

describe('who can see the scene', () => {
  const search = '?mundo=umbral&escena=mirador';

  it('only with ending A saved, or with ?debug', () => {
    expect(miradorRequested(search, ['A'], false)).toBe(true);
    expect(miradorRequested(search, [], false)).toBe(false);
    expect(miradorRequested(search, ['tarde'], false)).toBe(false);
    expect(miradorRequested(search, [], true)).toBe(true);
  });

  it('only in Umbral and only when asked for', () => {
    expect(miradorRequested('?mundo=archivo&escena=mirador', ['A'], true)).toBe(false);
    expect(miradorRequested('?mundo=umbral', ['A'], true)).toBe(false);
    expect(miradorRequested('?escena=mirador', ['A'], true)).toBe(false);
    expect(miradorRequested('?mundo=Umbral&escena=mirador', ['A'], false)).toBe(true);
  });
});
