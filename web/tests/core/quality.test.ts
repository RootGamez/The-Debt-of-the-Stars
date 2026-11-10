import { describe, expect, it } from 'vitest';
import { qualityFromQuery, sunShadowSizeFromQuery } from '../../src/core/quality';

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

describe('the size of the sun shadow map', () => {
  it('is 2048 on high quality and none on low', () => {
    expect(sunShadowSizeFromQuery('', 'alta')).toBe(2048);
    expect(sunShadowSizeFromQuery('?calidad=baja', 'baja')).toBe(0);
  });

  it('can be chosen from the address, among the sizes that make sense', () => {
    expect(sunShadowSizeFromQuery('?sombra=1024', 'alta')).toBe(1024);
    expect(sunShadowSizeFromQuery('?sombra=512', 'alta')).toBe(512);
    expect(sunShadowSizeFromQuery('?sombra=4096', 'alta')).toBe(4096);
  });

  it('turns off with sombra=no, whatever the quality, and ignores nonsense', () => {
    expect(sunShadowSizeFromQuery('?sombra=no', 'alta')).toBe(0);
    expect(sunShadowSizeFromQuery('?sombra=777', 'alta')).toBe(2048);
    expect(sunShadowSizeFromQuery('?sombra=1024', 'baja')).toBe(1024);
  });
});
