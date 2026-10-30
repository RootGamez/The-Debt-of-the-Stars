// Monta el epílogo (Fase 10D) en el Archivo de las Puertas: los planos del Contrapeso en su Banco (se ven mientras
// no se lleven), su verbo y el lector de las bocas de casa. Cruzar una boca lo decide el jugador en el lector; el
// final sale de esa boca y de los planos (game/epilogue.ts). Solo si el sistema tiene el Archivo.
import type { CustomReaders } from '../ui/puzzlePanel';
import { mouthsBody } from '../ui/mouthsBody';
import { WorldDataError } from '../worlds/markers';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { EPILOGUE_WORLD } from '../worlds/worldSelection';
import {
  OFFSETS_CONCLUSION,
  TEST_DAY_CONCLUSION,
  createEpiloguePlay,
  endingFor,
  mouthById,
  type Ending,
  type EpiloguePlay,
} from './epilogue';

/** Los planos enrollados sobre el Banco (pieza suelta del modelo). */
const PLANS_OBJECT = 'puertas_Planos';

export interface EpilogueRigOptions {
  runtimes: ReadonlyMap<string, WorldRuntime>;
  /** Si una conclusión ya está en el Registro. */
  knows: (conclusion: string) => boolean;
  /** Se cruza una boca: el final que sale de ella y de los planos. */
  onCross: (ending: Ending) => void;
}

export interface EpilogueRig {
  readonly play: EpiloguePlay;
  /** El lector del atril: las bocas de casa. */
  readonly readers: CustomReaders;
  /** Una vez por fotograma. */
  update(): void;
}

export function createEpilogueRig(options: EpilogueRigOptions): EpilogueRig | undefined {
  const { runtimes, knows, onCross } = options;
  const archive = runtimes.get(EPILOGUE_WORLD);
  if (!archive) return undefined;
  const plans = archive.world.scene.getObjectByName(PLANS_OBJECT);
  if (!plans) throw new WorldDataError(`${archive.id}: falta ${PLANS_OBJECT} en el Banco`);
  const play = createEpiloguePlay();
  let crossed = false;
  return {
    play,
    readers: {
      bocas: (status, _solved, solve) =>
        mouthsBody(
          {
            knowledge: () => ({
              offsets: knows(OFFSETS_CONCLUSION),
              testDay: knows(TEST_DAY_CONCLUSION),
            }),
            carryingPlans: () => play.carryingPlans,
            cross: (id) => {
              const mouth = mouthById(id);
              const ending = mouth ? endingFor(mouth, play.carryingPlans) : undefined;
              if (crossed || !ending) return;
              crossed = true;
              onCross(ending);
            },
          },
          status,
          solve,
        ),
    },
    update() {
      plans.visible = !play.carryingPlans;
    },
  };
}
