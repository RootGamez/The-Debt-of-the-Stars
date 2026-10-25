// Datos de prueba del grafo de pistas: un grafo mínimo válido que cada test puede romper o recorrer.
import { parseClues } from '../../src/registry/clues';

/** Elemento de una lista de los datos de prueba (falla si no existe, en vez de usar `!`). */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Los datos de prueba no tienen el elemento ${index}`);
  return item;
}

/** La lectura profunda de `umbral.envios` en los datos de prueba. */
export function deepOf(d: { fuentes: { profunda?: { requiere: string[] } }[] }): {
  requiere: string[];
} {
  const deep = at(d.fuentes, 1).profunda;
  if (!deep) throw new Error('umbral.envios no tiene lectura profunda en los datos de prueba');
  return deep;
}

export const WORLDS = ['umbral', 'archivo', 'cicatriz'];
export const EVENTS = ['boca_destello'];

/** Datos mínimos válidos; cada test rompe una cosa. Se devuelve una copia nueva cada vez. */
export function raw() {
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

export function parse(data: unknown = raw()) {
  return parseClues(data, { worlds: WORLDS, events: EVENTS });
}
