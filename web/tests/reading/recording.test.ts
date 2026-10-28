import { describe, expect, it } from 'vitest';
import {
  clarity,
  garble,
  MAX_SPEED,
  MIN_SPEED,
  RecordingPlayback,
  sliderFromSpeed,
  speedFromSlider,
  timeline,
} from '../../src/reading/recording';

describe('clarity', () => {
  it('is complete when the speed undoes the clock it was recorded with', () => {
    expect(clarity(5, 0.2)).toBe(1);
    expect(clarity(1, 1)).toBe(1);
  });

  it('forgives a small error either way', () => {
    expect(clarity(5 * 1.1, 0.2)).toBe(1);
    expect(clarity(5 / 1.1, 0.2)).toBe(1);
  });

  it('fades as the speed drifts away and is lost far from it', () => {
    const near = clarity(4, 0.2);
    const far = clarity(2.5, 0.2);

    expect(near).toBeLessThan(1);
    expect(far).toBeLessThan(near);
    expect(clarity(1, 0.2)).toBe(0);
    expect(clarity(40, 0.2)).toBe(0);
  });

  it('is symmetric: too fast is as bad as too slow', () => {
    expect(clarity(5 * 1.6, 0.2)).toBeCloseTo(clarity(5 / 1.6, 0.2));
  });

  it('survives values that are not numbers', () => {
    expect(clarity(Number.NaN, 0.2)).toBe(0);
    expect(clarity(1, 0)).toBe(0);
  });
});

describe('the speed wheel', () => {
  it('covers from a quarter to eight times the speed', () => {
    expect(speedFromSlider(0)).toBeCloseTo(MIN_SPEED);
    expect(speedFromSlider(1)).toBeCloseTo(MAX_SPEED);
  });

  it('goes back and forth without losing the value', () => {
    for (const speed of [0.3, 1, 2.2, 5, 7.5]) {
      expect(speedFromSlider(sliderFromSpeed(speed))).toBeCloseTo(speed);
    }
  });

  it('clamps what is out of range', () => {
    expect(speedFromSlider(-1)).toBeCloseTo(MIN_SPEED);
    expect(sliderFromSpeed(100)).toBe(1);
  });
});

describe('timeline', () => {
  it('gives each line its time at the natural pace of speech, with a pause between lines', () => {
    const { lines, duration } = timeline(['uno dos tres cuatro cinco', 'seis']);

    expect(lines[0]?.start).toBe(0);
    expect(lines[0]?.end).toBeCloseTo(2);
    expect(lines[1]?.start).toBeGreaterThan(lines[0]?.end ?? 0);
    expect(duration).toBeGreaterThan(lines[1]?.end ?? 0);
  });

  it('gives even a one-word line enough time to be heard', () => {
    const { lines } = timeline(['Hola']);

    expect((lines[0]?.end ?? 0) - (lines[0]?.start ?? 0)).toBeGreaterThanOrEqual(0.8);
  });
});

describe('garble', () => {
  const sentence = 'Grabo desde la boca del Nudo, cerca de la semilla.';

  it('leaves the text alone when it is fully clear', () => {
    expect(garble(sentence, 1, 1)).toBe(sentence);
  });

  it('stretches the vowels when it sounds too slow', () => {
    const slow = garble('Nudo', 0, 0.2);

    expect(slow).not.toBe('Nudo');
    expect(slow).toMatch(/uu/);
  });

  it('swallows the vowels when it sounds too fast', () => {
    expect(garble('Nudo', 0, 4)).toBe('Nd');
  });

  it('keeps more words as the clarity grows', () => {
    const words = sentence.split(' ');
    const intact = (text: string) =>
      text.split(' ').filter((word, index) => word === words[index]).length;

    expect(intact(garble(sentence, 0, 0.2))).toBeLessThan(intact(garble(sentence, 0.5, 0.2)));
    expect(intact(garble(sentence, 0.5, 0.2))).toBeLessThan(words.length);
  });

  it('always garbles the same way (no flicker between frames)', () => {
    expect(garble(sentence, 0.4, 0.3)).toBe(garble(sentence, 0.4, 0.3));
  });

  it('keeps punctuation and the number of words', () => {
    const garbled = garble(sentence, 0, 3);

    expect(garbled.split(' ')).toHaveLength(sentence.split(' ').length);
    expect(garbled).toMatch(/,/);
    expect(garbled.endsWith('.')).toBe(true);
  });
});

describe('RecordingPlayback', () => {
  const lines = ['Aquí dentro un día vuestro son cinco.', 'La luz sale torcida.'];

  function play(playback: RecordingPlayback, seconds: number, step = 0.05): void {
    for (let t = 0; t < seconds; t += step) playback.update(step);
  }

  it('starts at the given speed, before the first word', () => {
    const playback = new RecordingPlayback(lines, 0.2, 1);
    const view = playback.view();

    expect(view.speed).toBe(1);
    expect(view.lines.every((line) => line.state === 'pending')).toBe(true);
  });

  it('crawls when played as is: after ten seconds the first line is still going', () => {
    const playback = new RecordingPlayback(lines, 0.2, 1);

    play(playback, 10);

    expect(playback.view().lines[0]?.state).toBe('playing');
    expect(playback.understood).toBe(false);
  });

  it('is understood after hearing every line at the right speed', () => {
    const playback = new RecordingPlayback(lines, 0.2, 5);

    play(playback, 12);

    expect(playback.understood).toBe(true);
    expect(playback.view().lines.map((line) => line.text)).toEqual(lines);
  });

  it('does not count a line whose speed was changed to a wrong one halfway', () => {
    const playback = new RecordingPlayback(lines, 0.2, 5);
    play(playback, 1);

    playback.setSpeed(2);
    play(playback, 1);
    playback.setSpeed(5);
    play(playback, 2.5);

    expect(playback.view().lines[0]?.heard).toBe(false);
  });

  it('plays again from the start, so a missed line can be heard on the next pass', () => {
    const playback = new RecordingPlayback(lines, 0.2, 2);
    play(playback, 30);
    expect(playback.understood).toBe(false);

    playback.setSpeed(5);
    play(playback, 30);

    expect(playback.understood).toBe(true);
  });

  it('reveals the line word by word', () => {
    const playback = new RecordingPlayback(lines, 0.2, 5);

    play(playback, 1);
    const shown = playback.view().lines[0]?.text ?? '';

    expect(shown.length).toBeGreaterThan(0);
    expect(shown.split(' ').length).toBeLessThan((lines[0] ?? '').split(' ').length);
  });

  it('keeps a line clear once it was understood, even if the wheel moves later', () => {
    const playback = new RecordingPlayback(lines, 0.2, 5);
    play(playback, 12);

    playback.setSpeed(1);

    expect(playback.view().lines[0]?.text).toBe(lines[0]);
  });

  it('clamps the speed to the wheel and ignores nonsense', () => {
    const playback = new RecordingPlayback(lines, 0.2, 1);

    playback.setSpeed(100);
    expect(playback.speed).toBe(MAX_SPEED);
    playback.setSpeed(Number.NaN);
    expect(playback.speed).toBe(MAX_SPEED);
    playback.update(Number.NaN);
    playback.update(-5);
    expect(playback.view().lines[0]?.state).toBe('pending');
  });

  it('says when someone is speaking (for the murmur) and how fast it sounds', () => {
    const playback = new RecordingPlayback(lines, 0.2, 5);

    play(playback, 0.5);

    expect(playback.speaking).toBe(true);
    expect(playback.factor).toBeCloseTo(1);
  });
});
