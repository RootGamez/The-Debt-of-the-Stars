import { describe, expect, it } from 'vitest';
import archivo from '../../src/data/pistas/archivo.json';
import cicatriz from '../../src/data/pistas/cicatriz.json';
import conclusiones from '../../src/data/pistas/conclusiones.json';
import hechos from '../../src/data/pistas/hechos.json';
import hilos from '../../src/data/pistas/hilos.json';
import hogar from '../../src/data/pistas/hogar.json';
import laboratorio from '../../src/data/pistas/laboratorio.json';
import luna from '../../src/data/pistas/luna.json';
import observatorio from '../../src/data/pistas/observatorio.json';
import puertas from '../../src/data/pistas/puertas.json';
import taller from '../../src/data/pistas/taller.json';
import umbral from '../../src/data/pistas/umbral.json';
import { loadClues } from '../../src/data/pistas';
import { localizeClues, type RawClues } from '../../src/i18n/localizeClues';
import { setLanguage } from '../../src/i18n';

const fuentes = [
  ...hogar,
  ...luna,
  ...umbral,
  ...archivo,
  ...taller,
  ...cicatriz,
  ...observatorio,
  ...laboratorio,
  ...puertas,
];
const raw: RawClues = { hilos, hechos, conclusiones, fuentes };
const english = localizeClues(raw, 'en');

type Source = {
  id: string;
  titulo: string;
  superficial: { texto: string[] };
  profunda?: { texto: string[] };
};
const SPANISH_WORDS = /\b(el|la|los|las|una|que|con|por|para|pero|como|todo|nada)\b/i;
const sources = fuentes as Source[];
const translated = english.fuentes as Source[];

describe('the English clues', () => {
  it('translate every title and every fact, thread and conclusion', () => {
    const untouched = (before: readonly unknown[], after: readonly unknown[], field: string) =>
      before.filter((entry, i) => {
        const a = (entry as Record<string, unknown>)[field];
        const b = (after[i] as Record<string, unknown>)[field];
        return a === b;
      });
    expect(untouched(hechos, english.hechos, 'frase')).toEqual([]);
    expect(untouched(hilos, english.hilos, 'pregunta')).toEqual([]);
    expect(untouched(hilos, english.hilos, 'respuesta')).toEqual([]);
    expect(untouched(conclusiones, english.conclusiones, 'titulo')).toEqual([]);
    expect(untouched(fuentes, english.fuentes, 'titulo')).toEqual([]);
  });

  it('keep the paragraphs of every written reading, in the same number', () => {
    sources.forEach((source, i) => {
      const other = translated[i];
      expect(other?.superficial.texto.length, source.id).toBe(source.superficial.texto.length);
      expect(other?.profunda?.texto.length, source.id).toBe(source.profunda?.texto.length);
    });
  });

  it('leave no written Spanish paragraph behind', () => {
    const leftovers = translated
      .flatMap((s) =>
        [...s.superficial.texto, ...(s.profunda?.texto ?? [])].map((p) => [s.id, p] as const),
      )
      .filter(([, p]) => !p.startsWith('[') && SPANISH_WORDS.test(p) && /[áéíóúñ¿¡]/.test(p));
    expect(leftovers).toEqual([]);
  });

  it('keep the graph untouched: same ids, threads and requirements', () => {
    const TEXT_KEYS = [
      'frase',
      'rumor',
      'pregunta',
      'respuesta',
      'titulo',
      'superficial',
      'profunda',
      'pista',
      'sabe',
      'accion',
    ];
    const graph = (list: readonly unknown[]) =>
      list.map((e) => {
        const entry = e as Record<string, { hechos?: unknown; requiere?: unknown } | undefined>;
        const rest = Object.entries(entry).filter(([key]) => !TEXT_KEYS.includes(key));
        return {
          ...Object.fromEntries(rest),
          s: entry['superficial']?.hechos,
          p: entry['profunda']?.requiere,
        };
      });
    expect(graph(english.hechos)).toEqual(graph(hechos));
    expect(graph(english.fuentes)).toEqual(graph(fuentes));
  });

  it('pass the same validation as the Spanish ones when the game runs in English', () => {
    setLanguage('en');
    expect(() => loadClues()).not.toThrow();
    setLanguage('es');
  });

  it('translate the deduction lines of every conclusion and the lead of every fact', () => {
    const unchanged = (before: readonly unknown[], after: readonly unknown[], field: string) =>
      before
        .map((entry, i) => [entry, after[i]] as [Record<string, unknown>, Record<string, unknown>])
        .filter(([a]) => a[field] !== undefined)
        .filter(([a, b]) => a[field] === b[field])
        .map(([a]) => a.id);
    expect(unchanged(hechos, english.hechos, 'pista')).toEqual([]);
    for (const field of ['sabe', 'accion', 'pregunta'])
      expect(unchanged(conclusiones, english.conclusiones, field), field).toEqual([]);
  });
});
