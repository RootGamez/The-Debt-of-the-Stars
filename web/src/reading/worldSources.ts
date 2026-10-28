// Las fuentes de lectura de un mundo ya cargado: dónde están (en el marco del propio mundo), qué eventos
// se presencian y sus rombos. Se crea una vez por mundo, ANTES de colgarlo de su pivote en la escena: las
// posiciones salen de las marcas de Blender tal como están en el modelo.
import { Vector3 } from 'three';
import type { RaycastWorld } from '../physics/collisionWorld';
import { surfaceUp, type GravityWell } from '../physics/gravity';
import type { Clues } from '../registry/clues';
import type { Interactable } from '../registry/interaction';
import { createSourceMarkers, type SourceMarkers } from '../render/sourceMarkers';
import type { WorldRuntime } from '../worlds/worldRuntime';

export interface EventSource {
  sourceId: string;
  position: Vector3;
  radius: number;
}

export interface WorldSources {
  world: string;
  interactables: Interactable[];
  eventSources: EventSource[];
  /** Los rombos cuelgan del propio mundo, así que se mueven con él. */
  markers: SourceMarkers;
  collision: RaycastWorld;
  /** Pozo del mundo en su propio marco (de él sale el "arriba" de cada punto). */
  well: GravityWell;
}

function worldPosition(object: { getWorldPosition(target: Vector3): Vector3 }): Vector3 {
  return object.getWorldPosition(new Vector3());
}

export function createWorldSources(runtime: WorldRuntime, clues: Clues): WorldSources {
  const { world, well, collision } = runtime;
  if (world.scene.parent)
    throw new Error(`${runtime.id}: las fuentes se crean antes de colgar el mundo`);
  const interactables: Interactable[] = world.markers.interactions
    .filter((m) => clues.sourceById.has(m.clueId))
    .map((m) => ({ id: m.clueId, position: worldPosition(m.object) }));
  const eventSources: EventSource[] = world.markers.triggers.flatMap((trigger) => {
    const source = clues.sources.find((s) => s.kind === 'evento' && s.eventName === trigger.event);
    return source
      ? [{ sourceId: source.id, position: worldPosition(trigger.object), radius: trigger.radius }]
      : [];
  });
  return {
    world: runtime.id,
    interactables,
    eventSources,
    markers: createSourceMarkers(world.scene, interactables, (p) => surfaceUp(p, well)),
    collision,
    well,
  };
}
