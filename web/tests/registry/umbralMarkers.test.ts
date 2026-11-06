// Regla 5 de CONTEXTO_PISTAS.md con los modelos reales: las fuentes de cada mundo y sus marcas (del modelo
// por código o del .glb exportado de Blender) se corresponden. Cuando se construya otro mundo se añade aquí.
import { describe, expect, it } from 'vitest';
import { loadClues, TRIGGER_EVENTS } from '../../src/data/pistas';
import { checkMarkers } from '../../src/registry/graphRules';
import { loadBuiltWorld } from '../helpers/builtWorlds';

/** Mundos con modelo y marcas de lectura ya construidos. */
const BUILT_WORLDS = [
  'umbral',
  'archivo',
  'taller',
  'cicatriz',
  'observatorio',
  'laboratorio',
  'hogar',
  'luna',
  'puertas',
];

const load = loadBuiltWorld;

describe.each(BUILT_WORLDS)('the markers of %s', (world) => {
  const clues = loadClues();

  it('match the sources of the clue graph (rule 5)', async () => {
    const { markers } = await load(world);

    expect(
      checkMarkers(clues, world, {
        clueIds: markers.interactions.map((i) => i.clueId),
        events: markers.triggers.map((t) => t.event),
      }),
    ).toEqual([]);
  });

  it('use only trigger names the clue data knows about', async () => {
    const { markers } = await load(world);

    for (const trigger of markers.triggers) expect(TRIGGER_EVENTS).toContain(trigger.event);
  });

  it('use the kind the clue data declares for each source', async () => {
    const { markers } = await load(world);

    for (const interaction of markers.interactions) {
      expect(clues.sourceById.get(interaction.clueId)?.kind).toBe(interaction.kind);
    }
  });
});

describe('the Observatorio', () => {
  it('leaves the displaced image of the Nudo to the game (it moves on its rails)', async () => {
    const { markers } = await load('observatorio');

    // Solo los faroles de la alineación (luz del lugar): la imagen del Nudo no es un punto fijo del modelo.
    expect(markers.eventProps.map((p) => p.object.name)).toEqual(['EVT_alineacion_Luces']);
  });
});

describe('the arrival world', () => {
  it('has the spot where the ship waits (PARK_Nave)', async () => {
    const { markers } = await load('umbral');

    expect(markers.parks.has('PARK_Nave')).toBe(true);
  });
});
