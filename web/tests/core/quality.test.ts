import { describe, expect, it } from 'vitest';
import {
  isSoftwareRenderer,
  qualityFromQuery,
  sunShadowSizeFromQuery,
} from '../../src/core/quality';

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

describe('software renderers', () => {
  it('are recognised by the name WebGL reports', () => {
    expect(
      isSoftwareRenderer(
        'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
      ),
    ).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(
      isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)'),
    ).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });

  it('get no sun shadow unless the address asks for one', () => {
    expect(sunShadowSizeFromQuery('', 'alta', true)).toBe(0);
    expect(sunShadowSizeFromQuery('?sombra=1024', 'alta', true)).toBe(1024);
    expect(sunShadowSizeFromQuery('', 'alta', false)).toBe(2048);
  });
});
