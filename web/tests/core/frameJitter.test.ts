import { describe, expect, it } from 'vitest';
import { createFrameJitter, summarizeJitter } from '../../src/core/frameJitter';

const frame = (seconds: number, moved = 0, lookPixels = 0) => ({ seconds, moved, lookPixels });

describe('registrador de tirones', () => {
  it('sin fotogramas devuelve ceros', () => {
    expect(summarizeJitter([])).toMatchObject({ frames: 0, medianMs: 0, maxMs: 0, speedMax: 0 });
  });

  it('cuenta los fotogramas largos respecto a la mediana', () => {
    const s = summarizeJitter([frame(0.007), frame(0.007), frame(0.007), frame(0.02)]);
    expect(s.medianMs).toBeCloseTo(7);
    expect(s.longFrames).toBe(1);
    expect(s.maxMs).toBeCloseTo(20);
  });

  it('mide la velocidad aparente solo mientras se anda', () => {
    const s = summarizeJitter([frame(0.01, 0.02), frame(0.01, 0.03), frame(0.01, 0)]);
    expect(s.speedMin).toBeCloseTo(2);
    expect(s.speedMax).toBeCloseTo(3);
  });

  it('anota la mayor mirada de un fotograma', () => {
    const s = summarizeJitter([frame(0.01, 0, 3), frame(0.01, 0, 40), frame(0.01)]);
    expect(s.lookMaxPx).toBe(40);
    expect(s.lookFrames).toBe(2);
  });

  it('solo recuerda la última ventana', () => {
    const jitter = createFrameJitter(2);
    jitter.record(frame(1));
    jitter.record(frame(0.01));
    jitter.record(frame(0.01));
    expect(jitter.summary().maxMs).toBeCloseTo(10);
  });
});
