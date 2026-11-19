import { describe, expect, it } from 'vitest';
import { wrapLines } from '../../src/ui/notebookCanvas';

/** Cada letra mide lo mismo: 1 unidad. */
const measure = (s: string): number => Array.from(s).length;

describe('the pages of your notebook painted for the scene (F4)', () => {
  it('wraps a line by words without going past the width', () => {
    const lines = wrapLines('Dos relojes, la misma hora al empezar. Ya no.', 16, measure);
    expect(lines).toEqual(['Dos relojes, la', 'misma hora al', 'empezar. Ya no.']);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(16);
  });

  it('keeps every word, in order, and collapses repeated spaces', () => {
    const text = 'La   deuda no es de energía,\n sino de tiempo.';
    expect(wrapLines(text, 12, measure).join(' ')).toBe(
      'La deuda no es de energía, sino de tiempo.',
    );
  });

  it('puts a word longer than the width on a line of its own instead of losing it', () => {
    expect(wrapLines('a desacompasadamente b', 6, measure)).toEqual([
      'a',
      'desacompasadamente',
      'b',
    ]);
  });

  it('gives nothing for an empty text', () => {
    expect(wrapLines('   ', 10, measure)).toEqual([]);
  });
});
