// La cronología del ciclo ya validada: viene de src/data/cronologia.json y, con `?debug&ciclo=<s>`,
// se escala a un ciclo más corto para las pruebas.
import chronologyData from '../data/cronologia.json';
import { WORLD_IDS } from '../worlds/worldSelection';
import {
  cycleLengthFromQuery,
  parseChronology,
  scaleChronology,
  type Chronology,
} from './timeline';

export function loadChronology(search: string): Chronology {
  const chronology = parseChronology(chronologyData, WORLD_IDS);
  const testLength = cycleLengthFromQuery(search);
  return testLength === undefined ? chronology : scaleChronology(chronology, testLength);
}
