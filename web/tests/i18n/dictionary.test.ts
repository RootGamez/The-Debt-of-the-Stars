import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EN } from '../../src/i18n/en';
import {
  LANGUAGES,
  fill,
  getLanguage,
  languageFromNavigator,
  loadLanguage,
  plural,
  saveLanguage,
  setLanguage,
  t,
} from '../../src/i18n';
import type { KeyValueStore } from '../../src/core/save';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

const CALL = /(?<![\w.])t\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;

/** Todo texto literal pasado a `t(...)` en el código del juego. */
function translatableTexts(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles('src').filter((f) => !f.includes(join('src', 'i18n')))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(CALL)) {
      const text = (match[2] ?? '').replace(/\\(['"\\])/g, '$1');
      found.set(text, file);
    }
  }
  return found;
}

const holes = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('the English dictionary', () => {
  const texts = translatableTexts();

  it('finds the texts the game translates', () => {
    expect(texts.size).toBeGreaterThan(100);
  });

  it('has an entry for every text passed to t()', () => {
    const missing = [...texts]
      .filter(([text]) => !(text in EN))
      .map(([text, file]) => `${file}: ${text}`);
    expect(missing).toEqual([]);
  });

  it('keeps the same {holes} as the Spanish text', () => {
    const broken = Object.entries(EN).filter(([es, en]) => holes(es).join() !== holes(en).join());
    expect(broken).toEqual([]);
  });

  it('has no empty translations', () => {
    expect(Object.entries(EN).filter(([, en]) => en.trim() === '')).toEqual([]);
  });
});

describe('translating', () => {
  it('returns the Spanish text in Spanish and the English one in English', () => {
    setLanguage('es');
    expect(t('Volver')).toBe('Volver');
    setLanguage('en');
    expect(t('Volver')).toBe('Back');
    setLanguage('es');
  });

  it('shows the Spanish text when there is no translation', () => {
    setLanguage('en');
    expect(t('Texto que nadie tradujo')).toBe('Texto que nadie tradujo');
    setLanguage('es');
  });

  it('fills the {holes}', () => {
    expect(fill('{a} y {b} y {c}', { a: 1, b: 'dos' })).toBe('1 y dos y {c}');
    setLanguage('en');
    expect(t('Ciclos vividos: {loops}', { loops: 3 })).toBe('Loops lived: 3');
    expect(plural(1, 'día', 'días')).toBe('day');
    expect(plural(2, 'día', 'días')).toBe('days');
    setLanguage('es');
  });

  it('picks the browser language, English when it is neither', () => {
    expect(languageFromNavigator(['es-AR', 'en'])).toBe('es');
    expect(languageFromNavigator(['fr-FR', 'en-US'])).toBe('en');
    expect(languageFromNavigator(['de'])).toBe('en');
    expect(languageFromNavigator([])).toBe('en');
  });

  it('remembers the chosen language over the browser one', () => {
    const store = memoryStore();
    expect(loadLanguage(store, ['es'])).toBe('es');
    expect(saveLanguage(store, 'en')).toBe(true);
    expect(loadLanguage(store, ['es'])).toBe('en');
    expect(loadLanguage(memoryStore({ 'bucle-tiempo:idioma': 'klingon' }), ['en'])).toBe('en');
    expect(saveLanguage(null, 'en')).toBe(false);
  });

  it('starts in Spanish outside the browser', () => {
    expect(getLanguage()).toBe('es');
    expect(LANGUAGES).toEqual(['es', 'en']);
  });
});
