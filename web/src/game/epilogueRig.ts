// Monta el epílogo (Fase 10D) en el Archivo de las Puertas: el lector de las bocas de casa. Cruzar una boca lo
// decide el jugador en el lector; el final sale de esa boca (game/epilogue.ts). Solo si el sistema tiene el Archivo.
import type { CustomReaders } from '../ui/puzzlePanel';
import { mouthsBody } from '../ui/mouthsBody';
import type { WorldRuntime } from '../worlds/worldRuntime';
import { EPILOGUE_WORLD } from '../worlds/worldSelection';
import {
  OFFSETS_CONCLUSION,
  TEST_DAY_CONCLUSION,
  arrivalDay,
  mouthById,
  type MouthId,
} from './epilogue';

export interface EpilogueRigOptions {
  runtimes: ReadonlyMap<string, WorldRuntime>;
  /** Si una conclusión ya está en el Registro. */
  knows: (conclusion: string) => boolean;
  /** Se elige una boca de casa: se abre en el cielo (T11). */
  onChoose: (id: MouthId) => void;
}

export interface EpilogueRig {
  /** El lector del atril: las bocas de casa. */
  readonly readers: CustomReaders;
}

export function createEpilogueRig(options: EpilogueRigOptions): EpilogueRig | undefined {
  const { runtimes, knows, onChoose } = options;
  if (!runtimes.get(EPILOGUE_WORLD)) return undefined;
  return {
    readers: {
      bocas: (status, _solved, solve) =>
        mouthsBody(
          {
            knowledge: () => ({
              offsets: knows(OFFSETS_CONCLUSION),
              testDay: knows(TEST_DAY_CONCLUSION),
            }),
            cross: (id) => {
              const mouth = mouthById(id);
              if (mouth && arrivalDay(mouth) !== undefined) onChoose(id);
            },
          },
          status,
          solve,
        ),
    },
  };
}
