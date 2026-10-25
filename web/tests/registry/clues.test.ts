import { describe, expect, it } from 'vitest';
import { parseClues } from '../../src/registry/clues';
import { WorldDataError } from '../../src/worlds/markers';

/** Elemento de una lista de los datos de prueba (falla si no existe, en vez de usar `!`). */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Los datos de prueba no tienen el elemento ${index}`);
  return item;
}

/** La lectura profunda de `umbral.envios` en los datos de prueba. */
function deepOf(d: { fuentes: { profunda?: { requiere: string[] } }[] }): { requiere: string[] } {
  const deep = at(d.fuentes, 1).profunda;
  if (!deep) throw new Error('umbral.envios no tiene lectura profunda en los datos de prueba');
  return deep;
}

const WORLDS = ['umbral', 'archivo', 'cicatriz'];
const EVENTS = ['boca_destello'];

/** Datos mínimos válidos; cada test rompe una cosa. Se devuelve una copia nueva cada vez. */
function raw() {
  return structuredClone({
    hilos: [
      { id: 'H2', pregunta: '¿Qué causa el agujero negro?', respuesta: 'La deuda de tiempo.' },
      { id: 'H5', pregunta: '¿Dónde investigaban?', respuesta: 'En el Sitio Lento.' },
    ],
    hechos: [
      { id: 'deuda.palabra', hilos: ['H2'], frase: 'La placa habla de una cuenta.' },
      {
        id: 'lab.existe_lugar_lento',
        hilos: ['H5'],
        frase: 'Hubo un destino donde el tiempo casi no avanzaba.',
        menciona: ['lab.imagen_desplazada'],
        enlaces: ['deuda.palabra'],
      },
      {
        id: 'lab.imagen_desplazada',
        hilos: ['H5'],
        frase: 'Las estrellas se ven donde no están.',
        rumor: '¿Dónde está ese sitio, si nadie lo ve?',
      },
    ],
    conclusiones: [
      {
        id: 'K1',
        titulo: 'Existe un sitio lento',
        hilo: 'H5',
        requiere: ['lab.existe_lugar_lento'],
      },
      {
        id: 'K3',
        titulo: 'Dónde está de verdad',
        hilo: 'H5',
        requiere: ['K1', ['lab.imagen_desplazada', 'deuda.palabra']],
      },
    ],
    fuentes: [
      {
        id: 'umbral.placa',
        mundo: 'umbral',
        tipo: 'texto',
        titulo: 'Placa de inauguración',
        superficial: { texto: ['Hoy empieza la cuenta.'], hechos: ['deuda.palabra'] },
      },
      {
        id: 'umbral.envios',
        mundo: 'umbral',
        tipo: 'texto',
        titulo: 'Registro de envíos',
        borrador: true,
        superficial: { texto: ['Destino: —'], hechos: [] },
        profunda: {
          requiere: ['deuda.palabra'],
          texto: ['Los acuses casi no avanzan.'],
          hechos: ['lab.existe_lugar_lento'],
        },
      },
      {
        id: 'umbral.destello',
        mundo: 'umbral',
        tipo: 'evento',
        evento: 'boca_destello',
        titulo: 'El destello de La Boca',
        superficial: { texto: ['La Boca se abre un instante.'], hechos: ['lab.imagen_desplazada'] },
      },
    ],
  });
}

function parse(data: unknown = raw()) {
  return parseClues(data, { worlds: WORLDS, events: EVENTS });
}

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
