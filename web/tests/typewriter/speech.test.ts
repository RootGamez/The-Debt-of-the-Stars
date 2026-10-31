import { describe, expect, it } from 'vitest';
import { loadClues } from '../../src/data/pistas';
import { portraitOf, speechLines, voicePitch } from '../../src/typewriter/speech';

describe('who says each line of a talk', () => {
  it('gives the lines in «» to the speaker and the rest to the narration', () => {
    const lines = speechLines(
      ['La Directora te espera junto a la ventana.', '«Quiero que lo veas tú».', '  «Ve».'],
      'La Directora',
    );

    expect(lines).toEqual([
      { text: 'La Directora te espera junto a la ventana.', speaker: undefined },
      { text: '«Quiero que lo veas tú».', speaker: 'La Directora' },
      { text: '«Ve».', speaker: 'La Directora' },
    ]);
  });

  it('works on every talk of the game: each one has someone speaking', () => {
    const talks = loadClues().sources.filter((source) => source.kind === 'charla');

    expect(talks.length).toBeGreaterThan(0);
    for (const talk of talks) {
      const lines = speechLines(talk.surface.text, talk.title);
      expect(lines.some((line) => line.speaker === talk.title)).toBe(true);
    }
  });

  it('opens the Directora talk with narration, as the data writes it', () => {
    const talk = loadClues().sourceById.get('instituto.directora');

    expect(talk && speechLines(talk.surface.text, talk.title)[0]?.speaker).toBeUndefined();
  });
});

describe('the portraits of the talks', () => {
  it('draws the Directora and the Maestra apart, and any other Ool with the common one', () => {
    expect(portraitOf('instituto.directora')).toBe('directora');
    expect(portraitOf('instituto.maestra')).toBe('maestra');
    expect(portraitOf('aldea.pozo')).toBe('ool');
  });
});

describe('the voice of the letters', () => {
  it('gives each speaker their own steady tone, inside a pleasant range', () => {
    const directora = voicePitch('La Directora');

    expect(voicePitch('La Directora')).toBe(directora);
    expect(voicePitch('Una cría')).not.toBe(directora);
    for (const name of ['La Directora', 'La Maestra', 'Una cría', 'El pescador', undefined]) {
      expect(voicePitch(name)).toBeGreaterThanOrEqual(180);
      expect(voicePitch(name)).toBeLessThanOrEqual(440);
    }
  });
});
