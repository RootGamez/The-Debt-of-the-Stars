import { describe, expect, it } from 'vitest';
import { worldUrl } from '../../src/worlds/loadWorld';

describe('worldUrl', () => {
  it('points to the exported model inside public/models', () => {
    expect(worldUrl('umbral')).toBe(`${import.meta.env.BASE_URL}models/umbral.glb`);
  });
});
