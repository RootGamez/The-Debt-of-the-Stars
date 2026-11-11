// Monta los puzzles físicos del Archivo (T6): une su juego (archivoPlay.ts) con lo que se ve
// (render/archivoPuzzlesView.ts) a partir de las marcas de la Galería. Solo si el sistema tiene el Archivo.
import { Vector3, type Camera, type Object3D, type Scene } from 'three';
import { ORRERY } from '../puzzles/orrery';
import { createArchivoPuzzlesView } from '../render/archivoPuzzlesView';
import { orreryBody } from '../ui/orreryBody';
import type { CustomReaders } from '../ui/puzzlePanel';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { ARCHIVO_PLAY, createArchivoPlay, sphereSource, type ArchivoPlay } from './archivoPlay';
import type { LooseCarrier } from './looseCarry';

const WORLD = 'archivo';
/** A cuánto de un riel se considera «delante de él» (m). */
const RAIL_REACH = 1.6;

export interface ArchivoRig {
  readonly play: ArchivoPlay;
  /** Para dejar las piezas en cualquier sitio y volver a cogerlas. */
  readonly carrier: LooseCarrier;
  readonly readers: CustomReaders;
  /** Depuración: fija el riel más cercano (undefined lo suelta). */
  forceRail(rail: number | undefined): void;
  /** Una vez por fotograma; `slotEvent`: la luz de la ranura está entrando. */
  update(camera: Camera, dt: number, slotEvent: boolean): void;
}

export function createArchivoRig(options: {
  scene: Scene;
  runtimes: ReadonlyMap<string, WorldRuntime>;
}): ArchivoRig | undefined {
  const runtime = options.runtimes.get(WORLD);
  if (!runtime) return undefined;
  const marks = runtime.world.markers.interactions;
  const byClue = (clue: string): Object3D | undefined =>
    marks.find((m) => m.clueId === clue)?.object;
  const rails = marks
    .filter((m) => m.clueId === ARCHIVO_PLAY.orrery)
    .map((m) => m.object)
    .sort((a, b) => Number(a.userData['riel']) - Number(b.userData['riel']));
  const stand = byClue(ARCHIVO_PLAY.stand);
  if (rails.length !== ORRERY.rails || !stand) return undefined;
  const homes: Record<string, Object3D> = {};
  for (const id of ORRERY.spheres) {
    const home = byClue(sphereSource(id));
    if (home) homes[id] = home;
  }
  const prism = byClue(ARCHIVO_PLAY.prism);
  if (prism) homes['prisma'] = prism;
  const view = createArchivoPuzzlesView(options.scene, {
    homes,
    rails,
    stand,
    tablet: byClue(ARCHIVO_PLAY.slotTablet),
    world: runtime.world.scene,
  });

  const eye = new Vector3();
  const where = new Vector3();
  let forced: number | undefined;
  const nearestRail = (): number | undefined => {
    if (forced !== undefined) return forced;
    let best: number | undefined;
    let bestDistance = RAIL_REACH;
    for (const [index, rail] of rails.entries()) {
      const distance = rail.getWorldPosition(where).distanceTo(eye);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index + 1;
      }
    }
    return best;
  };
  const play = createArchivoPlay({ nearestRail });

  return {
    play,
    carrier: { world: WORLD, ...play.loosely },
    readers: { planetario: (status, _solved, solve) => orreryBody(play, status, solve) },
    forceRail(rail) {
      forced = rail;
    },
    update(camera, dt, slotEvent) {
      eye.copy(camera.position);
      play.update(dt);
      view.update(
        {
          pieces: play.pieces(),
          crank: play.crank,
          slotEvent,
          prismFitted: play.prismFitted,
        },
        camera,
      );
    },
  };
}
