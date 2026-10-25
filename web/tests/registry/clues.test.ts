import { describe, expect, it } from 'vitest';
import { at, deepOf, parse, raw } from '../helpers/clueFixture';
import { WorldDataError } from '../../src/worlds/markers';

describe('parseClues with valid data', () => {
  it('reads threads, facts, conclusions and sources', () => {
    const clues = parse();

    expect(clues.threads.map((t) => t.id)).toEqual(['H2', 'H5']);
    expect(clues.facts.get('lab.existe_lugar_lento')?.mentions).toEqual(['lab.imagen_desplazada']);
    expect(clues.facts.get('deuda.palabra')?.links).toEqual([]);
    expect(clues.conclusions.map((c) => c.id)).toEqual(['K1', 'K3']);
    expect(clues.sources.map((s) => s.id)).toEqual([
      'umbral.placa',
      'umbral.envios',
      'umbral.destello',
    ]);
  });

  it('normalizes a single requirement into a group of alternatives', () => {
    const [k1, k3] = parse().conclusions;

    expect(k1?.requires).toEqual([['lab.existe_lugar_lento']]);
    expect(k3?.requires).toEqual([['K1'], ['lab.imagen_desplazada', 'deuda.palabra']]);
  });

  it('keeps the draft flag, the deep reading and the event name', () => {
    const clues = parse();

    expect(clues.sources[0]?.draft).toBe(false);
    expect(clues.sources[1]?.draft).toBe(true);
    expect(clues.sources[1]?.deep?.requires).toEqual(['deuda.palabra']);
    expect(clues.sources[2]?.eventName).toBe('boca_destello');
  });

  it('indexes sources by id', () => {
    expect(parse().sourceById.get('umbral.envios')?.world).toBe('umbral');
  });
});

type Mutation = [name: string, change: (data: ReturnType<typeof raw>) => void, message: RegExp];

describe('parseClues rejects malformed data', () => {
  it.each<Mutation>([
    ['a repeated thread id', (d) => d.hilos.push({ ...at(d.hilos, 0) }), /H2/],
    ['a repeated fact id', (d) => d.hechos.push({ ...at(d.hechos, 0) }), /deuda\.palabra/],
    ['a fact id with odd characters', (d) => (at(d.hechos, 0).id = '<script>'), /<script>/],
    ['a fact in an unknown thread', (d) => (at(d.hechos, 0).hilos = ['H9']), /H9/],
    ['a fact without any thread', (d) => (at(d.hechos, 0).hilos = []), /deuda\.palabra.*hilo/],
    [
      'a mention of an unknown fact',
      (d) => (at(d.hechos, 1).menciona = ['no.existe']),
      /no\.existe/,
    ],
    [
      'a mentioned fact without rumor text',
      (d) => delete (d.hechos[2] as { rumor?: string }).rumor,
      /lab\.imagen_desplazada.*rumor/,
    ],
    ['a link to an unknown fact', (d) => (at(d.hechos, 1).enlaces = ['no.existe']), /no\.existe/],
    ['a repeated conclusion id', (d) => d.conclusiones.push({ ...at(d.conclusiones, 0) }), /K1/],
    [
      'a conclusion id equal to a fact id',
      (d) => (at(d.conclusiones, 0).id = 'deuda.palabra'),
      /deuda\.palabra/,
    ],
    ['a conclusion in an unknown thread', (d) => (at(d.conclusiones, 0).hilo = 'H9'), /H9/],
    [
      'a conclusion that requires something unknown',
      (d) => (at(d.conclusiones, 0).requiere = ['no.existe']),
      /K1.*no\.existe/,
    ],
    ['a conclusion without requirements', (d) => (at(d.conclusiones, 0).requiere = []), /K1/],
    ['an empty group of alternatives', (d) => (at(d.conclusiones, 0).requiere = [[]]), /K1/],
    [
      'conclusions that require each other',
      (d) => (at(d.conclusiones, 0).requiere = ['K3']),
      /K1.*K3|K3.*K1/,
    ],
    [
      'a source id with odd characters',
      (d) => (at(d.fuentes, 0).id = 'Umbral Placa'),
      /Umbral Placa/,
    ],
    [
      'two sources for the same event',
      (d) => d.fuentes.push({ ...at(d.fuentes, 2), id: 'umbral.destello_bis' }),
      /boca_destello/,
    ],
    ['a repeated source id', (d) => d.fuentes.push({ ...at(d.fuentes, 0) }), /umbral\.placa/],
    ['a source in an unknown world', (d) => (at(d.fuentes, 0).mundo = 'marte'), /marte/],
    ['an unknown source type', (d) => (at(d.fuentes, 0).tipo = 'video'), /video/],
    ['a source without title', (d) => (at(d.fuentes, 0).titulo = ''), /umbral\.placa.*titulo/],
    [
      'a source without surface reading',
      (d) => delete (d.fuentes[0] as { superficial?: unknown }).superficial,
      /umbral\.placa.*superficial/,
    ],
    [
      'a reading without text',
      (d) => (at(d.fuentes, 0).superficial.texto = []),
      /umbral\.placa.*texto/,
    ],
    [
      'a paragraph that is not text',
      (d) => (at(d.fuentes, 0).superficial.texto = [3 as never]),
      /umbral\.placa/,
    ],
    [
      'a source giving an unknown fact',
      (d) => (at(d.fuentes, 0).superficial.hechos = ['no.existe']),
      /umbral\.placa.*no\.existe/,
    ],
    [
      'a deep reading requiring an unknown fact',
      (d) => (deepOf(d).requiere = ['no.existe']),
      /umbral\.envios.*no\.existe/,
    ],
    ['a deep reading without requirements', (d) => (deepOf(d).requiere = []), /umbral\.envios/],
    [
      'an event source without event name',
      (d) => delete (d.fuentes[2] as { evento?: string }).evento,
      /umbral\.destello.*evento/,
    ],
    [
      'an event name that is not in the chronology',
      (d) => (at(d.fuentes, 2).evento = 'inventado'),
      /inventado/,
    ],
    [
      'a source scheduled in an unknown event',
      (d) => ((d.fuentes[0] as { cuando?: string }).cuando = 'inventado'),
      /inventado/,
    ],
  ])('rejects %s', (_name, change, message) => {
    const data = raw();
    change(data);

    expect(() => parse(data)).toThrow(WorldDataError);
    expect(() => parse(data)).toThrow(message);
  });
});

describe('parseClues with something that is not a clue file', () => {
  it.each([
    ['text', 'hola'],
    ['null', null],
    ['a list', []],
  ])('rejects %s', (_name, value) => {
    expect(() => parse(value)).toThrow(WorldDataError);
    expect(() => parse(value)).toThrow(/pistas/);
  });
});
