import { describe, expect, it } from 'vitest';
import { qualityFromQuery } from '../../src/core/quality';

describe('the graphics quality', () => {
  it('is high by default', () => {
    expect(qualityFromQuery('')).toBe('alta');
    expect(qualityFromQuery('?debug&mundo=cicatriz')).toBe('alta');
  });

  it('is low when the address asks for it', () => {
    expect(qualityFromQuery('?calidad=baja')).toBe('baja');
    expect(qualityFromQuery('?debug&calidad=BAJA')).toBe('baja');
  });

  it('ignores anything it does not know', () => {
    expect(qualityFromQuery('?calidad=ultra')).toBe('alta');
    expect(qualityFromQuery('?calidad=')).toBe('alta');
  });
});
