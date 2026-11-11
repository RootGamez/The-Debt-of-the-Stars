import { describe, expect, it } from 'vitest';
import { deathSoundOf } from '../../src/audio/deathSounds';

describe('the sound of each death', () => {
  it('has one for the deaths that have their own sound', () => {
    expect(deathSoundOf('caida')).toBe('death.caida');
    expect(deathSoundOf('ahogado')).toBe('death.ahogado');
    expect(deathSoundOf('calor')).toBe('death.calor');
    expect(deathSoundOf('absorcion')).toBe('death.absorcion');
  });

  it('shares a sound between deaths that feel alike', () => {
    expect(deathSoundOf('gas')).toBe('death.ahogado');
    expect(deathSoundOf('fin')).toBe('death.absorcion');
  });

  it('leaves silent the ones with another sound (crossings, the ship crash) or none yet', () => {
    for (const cause of ['gusano', 'horizonte', 'boca', 'choque', 'marea'] as const) {
      expect(deathSoundOf(cause)).toBeUndefined();
    }
    expect(deathSoundOf(undefined)).toBeUndefined();
  });
});
