import { describe, expect, it } from 'vitest';
import { loadEndingCards, readEndingCards } from '../../src/data/endings';
import { EN } from '../../src/i18n/en';
import { WorldDataError } from '../../src/worlds/markers';

const card = { titulo: 'Final', texto: ['Una línea.'] };

describe('the ending cards', () => {
  it('has one written card per ending in the game data, still drafts for Anthony', () => {
    const cards = loadEndingCards();

    for (const ending of ['A', 'B', 'tarde'] as const) {
      expect(cards[ending].title).not.toBe('');
      expect(cards[ending].draft).toBe(true);
      expect(cards[ending].text.length).toBeGreaterThan(2);
      expect(cards[ending].text.join(' ')).not.toContain('[texto pendiente]');
    }
  });

  it('has the English of every title and every line of every card', () => {
    const cards = loadEndingCards();

    for (const ending of ['A', 'B', 'tarde'] as const) {
      for (const line of [cards[ending].title, ...cards[ending].text]) {
        expect(EN[line], line).toBeTruthy();
      }
    }
  });

  it('reads title, text and the draft mark', () => {
    const cards = readEndingCards({ A: { ...card, borrador: true }, B: card, tarde: card });

    expect(cards.A).toEqual({ title: 'Final', text: ['Una línea.'], draft: true });
    expect(cards.B.draft).toBe(false);
  });

  it.each([
    ['a missing ending', { A: card, B: card }],
    ['an empty title', { A: { ...card, titulo: '' }, B: card, tarde: card }],
    ['no text', { A: { titulo: 'Final', texto: [] }, B: card, tarde: card }],
    ['text that is not text', { A: { titulo: 'Final', texto: [3] }, B: card, tarde: card }],
    ['something that is not an object', 'finales'],
  ])('rejects %s', (_name, data) => {
    expect(() => readEndingCards(data)).toThrow(WorldDataError);
  });
});
