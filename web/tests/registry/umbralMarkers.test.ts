// Regla 5 de CONTEXTO_PISTAS.md con el modelo real: las fuentes de Umbral y las marcas exportadas de
// Blender se corresponden. Cuando se construya otro mundo se añade aquí su archivo .glb.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadClues, TRIGGER_EVENTS } from '../../src/data/pistas';
import { checkMarkers } from '../../src/registry/graphRules';
import { parseWorld } from '../../src/worlds/loadWorld';

/** Mundos con modelo y marcas de lectura ya construidos. */
const BUILT_WORLDS = ['umbral'];

async function load(world: string) {
  const bytes = readFileSync(
    fileURLToPath(new URL(`../../public/models/${world}.glb`, import.meta.url)),
  );
  return parseWorld(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    world,
  );
}

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
