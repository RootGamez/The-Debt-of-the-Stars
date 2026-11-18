import { describe, expect, it } from 'vitest';
import {
  loadEndingCards,
  loadNoReturnCard,
  readEndingCards,
  readNoReturnCard,
} from '../../src/data/endings';
import { EN } from '../../src/i18n/en';
import { WorldDataError } from '../../src/worlds/markers';

const card = { titulo: 'Final', texto: ['Una línea.'] };

describe('the ending cards', () => {
  it('has one written card per ending in the game data, still drafts for Anthony', () => {
    const cards = loadEndingCards();

    for (const ending of ['A', 'tarde', 'tardeSalvado'] as const) {
      expect(cards[ending].title).not.toBe('');
      expect(cards[ending].draft).toBe(true);
      expect(cards[ending].text.length).toBeGreaterThan(2);
      expect(cards[ending].text.join(' ')).not.toContain('[texto pendiente]');
    }
  });

  it('has the English of every title and every line of every card', () => {
    const cards = loadEndingCards();

    for (const ending of ['A', 'tarde', 'tardeSalvado'] as const) {
      for (const line of [cards[ending].title, ...cards[ending].text]) {
        expect(EN[line], line).toBeTruthy();
      }
    }
  });

  it('no longer has an ending B', () => {
    expect(Object.keys(loadEndingCards())).not.toContain('B');
  });

  it('says in the saved-system card that the system was not theirs', () => {
    expect(loadEndingCards().tardeSalvado.text.join(' ')).toContain(
      'Salvaste un sistema que no era el tuyo y llegaste tarde al tuyo',
    );
  });

  it('reads title, text and the draft mark', () => {
    const cards = readEndingCards({
      A: { ...card, borrador: true },
      tarde: card,
      tardeSalvado: card,
    });

    expect(cards.A).toEqual({ title: 'Final', text: ['Una línea.'], draft: true });
    expect(cards.tarde.draft).toBe(false);
  });

  it.each([
    ['a missing ending', { A: card, tarde: card }],
    ['an empty title', { A: { ...card, titulo: '' }, tarde: card, tardeSalvado: card }],
    ['no text', { A: { titulo: 'Final', texto: [] }, tarde: card, tardeSalvado: card }],
    [
      'text that is not text',
      { A: { titulo: 'Final', texto: [3] }, tarde: card, tardeSalvado: card },
    ],
    ['something that is not an object', 'finales'],
  ])('rejects %s', (_name, data) => {
    expect(() => readEndingCards(data)).toThrow(WorldDataError);
  });
});

describe('the "no return" card (E5)', () => {
  it('is a written draft with its English and is not one of the endings', () => {
    const card = loadNoReturnCard();

    expect(card.title).toBe('Sin vuelta');
    expect(card.draft).toBe(true);
    expect(card.text.length).toBeGreaterThan(1);
    for (const line of [card.title, ...card.text]) expect(EN[line], line).toBeTruthy();
    expect(Object.keys(loadEndingCards())).not.toContain('sinVuelta');
  });

  it('fails when the card is missing', () => {
    expect(() => readNoReturnCard({ A: {}, tarde: {}, tardeSalvado: {} })).toThrow(WorldDataError);
  });
});
