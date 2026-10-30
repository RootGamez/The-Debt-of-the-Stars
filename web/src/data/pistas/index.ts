// Reúne los archivos de pistas (uno por mundo más hilos, hechos y conclusiones) y los valida una vez.
// Los textos y el grafo se editan en los JSON de esta carpeta (ver CONTEXTO_PISTAS.md).
import chronology from '../cronologia.json';
import { WORLD_IDS } from '../../worlds/worldSelection';
import { parseClues, type Clues } from '../../registry/clues';
import conclusiones from './conclusiones.json';
import hechos from './hechos.json';
import hilos from './hilos.json';
import archivo from './archivo.json';
import cicatriz from './cicatriz.json';
import hogar from './hogar.json';
import laboratorio from './laboratorio.json';
import luna from './luna.json';
import observatorio from './observatorio.json';
import puertas from './puertas.json';
import taller from './taller.json';
import umbral from './umbral.json';

/**
 * Nombres de las marcas `TRIG_` que dan hechos. Deben coincidir con `blender/marcas/<mundo>.json`
 * (lo comprueba la prueba de las marcas de Umbral).
 */
export const TRIGGER_EVENTS: readonly string[] = ['boca_destello'];

/** Orden de los mundos al juntar sus fuentes (el orden del Registro y de los textos). */
const SOURCE_FILES: readonly (readonly unknown[])[] = [
  hogar,
  luna,
  umbral,
  archivo,
  taller,
  cicatriz,
  observatorio,
  laboratorio,
  puertas,
];

export function chronologyEventIds(): string[] {
  const events = (chronology as { eventos: readonly { id: string }[] }).eventos;
  return events.map((e) => e.id);
}

let cached: Clues | undefined;

/** Datos de pistas ya validados (se calculan una sola vez). */
export function loadClues(): Clues {
  cached ??= parseClues(
    { hilos, hechos, conclusiones, fuentes: SOURCE_FILES.flat() },
    { worlds: WORLD_IDS, events: [...chronologyEventIds(), ...TRIGGER_EVENTS] },
  );
  return cached;
}
