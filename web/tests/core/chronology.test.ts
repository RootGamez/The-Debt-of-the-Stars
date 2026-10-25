import { describe, expect, it } from 'vitest';
import { loadChronology } from '../../src/core/chronology';

describe('loadChronology', () => {
  it('reads the real chronology of the cycle', () => {
    const chronology = loadChronology('');

    expect(chronology.duration).toBe(900);
    expect(chronology.events.map((e) => e.id)).toContain('agujero_negro');
  });

  it('scales it to a short cycle only with ?debug&ciclo', () => {
    expect(loadChronology('?ciclo=60').duration).toBe(900);
    expect(loadChronology('?debug&ciclo=60').duration).toBe(60);
  });
});
