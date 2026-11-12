import { describe, expect, it } from 'vitest';
import { CHAR_EM, DESIGN_FIT, bookLayout, tighter } from '../../src/registry/bookLayout';

const desk = { width: 1366, height: 768, uiScale: 1, textScale: 1 };
const phone = { width: 800, height: 360, uiScale: 1.25, textScale: 1 };

describe('the size of the notebook', () => {
  it('is an open book of 3:4 pages with the buttons below on a laptop', () => {
    const book = bookLayout(desk);

    expect(book.chrome).toBe('below');
    expect(book.single).toBe(false);
    expect(book.pageWidth / book.pageHeight).toBeCloseTo(0.75, 1);
    expect(book.fit).toEqual(DESIGN_FIT);
  });

  it('always fits on the screen, with room for the buttons', () => {
    const screens = [
      desk,
      phone,
      { ...phone, textScale: 2 },
      { width: 667, height: 375, uiScale: 1.25, textScale: 1.5 },
      { width: 932, height: 430, uiScale: 2, textScale: 2 },
      { width: 480, height: 900, uiScale: 1, textScale: 1 },
      { width: 1920, height: 1080, uiScale: 2, textScale: 2 },
      { width: 2560, height: 1440, uiScale: 1, textScale: 1 },
    ];
    for (const screen of screens) {
      const book = bookLayout(screen);
      const across = book.single ? 1 : 2;
      const button = 44 * screen.uiScale;
      const side = book.chrome === 'sides' ? 2 * button : 0;
      const below = book.chrome === 'below' ? button : 0;

      expect(book.pageWidth * across + side).toBeLessThanOrEqual(screen.width);
      expect(book.pageHeight + below).toBeLessThanOrEqual(screen.height);
      expect(book.fit.lines).toBeGreaterThanOrEqual(3);
      expect(book.fit.chars).toBeGreaterThanOrEqual(8);
    }
  });

  it('puts the buttons at the sides on a phone held sideways, so the book takes the whole height', () => {
    const book = bookLayout(phone);

    expect(book.chrome).toBe('sides');
    expect(book.pageHeight).toBeGreaterThan(phone.height * 0.9);
    // Más ancha que 3:4: en una pantalla baja, la página se ensancha para que quepan renglones enteros.
    expect(book.pageWidth / book.pageHeight).toBeGreaterThan(0.75);
  });

  it('never writes smaller than the minimum letter, and bigger letters are really bigger', () => {
    const normal = bookLayout(phone);
    const big = bookLayout({ ...phone, textScale: 2 });
    const deskBig = bookLayout({ ...desk, textScale: 2 });

    expect(normal.font).toBeGreaterThanOrEqual(15 * 1.25);
    expect(big.font).toBeGreaterThanOrEqual(2 * normal.font - 0.01);
    expect(deskBig.font).toBeCloseTo(2 * bookLayout(desk).font, 0);
  });

  it('holds less on each page with bigger letters', () => {
    const normal = bookLayout(desk).fit;
    const big = bookLayout({ ...desk, textScale: 2 }).fit;

    expect(big.lines).toBeLessThan(normal.lines);
    expect(big.chars).toBeLessThan(normal.chars);
  });

  it('shows a single, wider page when two would leave too few letters per line', () => {
    const two = bookLayout(phone);
    const one = bookLayout({ ...phone, textScale: 2 });

    expect(two.single).toBe(false);
    expect(one.single).toBe(true);
    expect(one.pageWidth).toBeGreaterThan(two.pageWidth);
    expect(one.fit.chars).toBeGreaterThanOrEqual(20);
  });

  it('counts the letters of a line from the width left between the margins', () => {
    const book = bookLayout(desk);
    const width = book.pageWidth - 2.08 * book.padX;

    expect(book.fit.chars).toBeCloseTo(width / (book.font * CHAR_EM), 0);
    expect(book.fit.lines).toBeCloseTo(
      (book.pageHeight - book.padTop - book.padBottom) / book.line,
      0,
    );
  });

  it('keeps the drawing of a world to less than half the page', () => {
    for (const screen of [desk, phone, { ...phone, textScale: 2 }]) {
      const book = bookLayout(screen);
      expect(book.fit.photoLines).toBeLessThan(book.fit.lines * 0.45 + 1);
      expect(book.photoWidth).toBeLessThanOrEqual(book.pageWidth);
    }
  });

  it('leaves less room per page when asked for a tighter fit', () => {
    const fit = tighter(DESIGN_FIT);

    expect(fit.lines).toBeLessThan(DESIGN_FIT.lines);
    expect(fit.chars).toBe(DESIGN_FIT.chars);
    expect(tighter({ ...DESIGN_FIT, lines: 3 }).lines).toBe(3);
  });
});
