import { describe, expect, it } from 'vitest';
import { carrySoundOf } from '../../src/audio/carrySounds';

describe('the sound of handling an object', () => {
  it('picks up with a leather handling sound', () => {
    for (const verb of ['coger', 'recoger', 'pinzar'])
      expect(carrySoundOf(verb)).toBe('carry.pickup');
  });

  it('places with a metallic click', () => {
    for (const verb of ['poner', 'dejar', 'echar', 'tirar'])
      expect(carrySoundOf(verb)).toBe('carry.snap');
  });

  it('drops with a thud', () => {
    expect(carrySoundOf('soltar')).toBe('carry.drop');
  });

  it('says nothing for a verb it does not know', () => {
    expect(carrySoundOf('examinar')).toBeUndefined();
  });
});
