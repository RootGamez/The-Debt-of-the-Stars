// De dónde saca el ocular el cielo (🟡, 2026-11-05): lo mira en vivo desde la escena, donde está el telescopio. La
// Brasa, el Nudo (su sitio verdadero, no su imagen) y los demás mundos, como direcciones unitarias desde quien mira
// y con el radio angular que ocupan. El resto (la lente, la imagen torcida) lo pone game/ocular.ts.
import { Vector3, type Group, type Object3D } from 'three';
import type { OcularBody, OcularSky } from './ocular';
import type { OcularSource } from '../ui/ocularBody';

export interface OcularSkyInput {
  /** La cámara (donde mira el jugador) y la Brasa, en la escena. */
  eye: Object3D;
  star: Object3D;
  /** Dónde está cada mundo en la escena y qué radio tiene. */
  groupOf(world: string): Group | undefined;
  radiusOf(world: string): number | undefined;
  worlds: readonly string[];
  /** El mundo escondido (el Nudo), si el sistema lo tiene. */
  hidden: string | undefined;
  /** El mundo donde se está (su marco) y la alineación en curso. */
  reference(): string | undefined;
  alignedNow(): boolean;
  /** El mundo del telescopio. */
  observatory: string;
}

/** El cielo visto desde el telescopio, o `undefined` si quien mira no está en el Observatorio. */
export function createOcularSource(input: OcularSkyInput): OcularSource {
  const eye = new Vector3();
  const there = new Vector3();
  return {
    time: () => performance.now() / 1000,
    sky: () => {
      if (input.reference() !== input.observatory) return undefined;
      input.eye.getWorldPosition(eye);
      const direction = (to: Vector3): Vector3 => to.clone().sub(eye).normalize();
      const brasa = direction(input.star.getWorldPosition(there));
      const hiddenGroup = input.hidden ? input.groupOf(input.hidden) : undefined;
      const nudo = hiddenGroup
        ? {
            dir: direction(hiddenGroup.getWorldPosition(there)),
            distance: hiddenGroup.getWorldPosition(there).distanceTo(eye),
          }
        : undefined;
      const bodies: OcularBody[] = [];
      for (const world of input.worlds) {
        if (world === input.observatory || world === input.hidden) continue;
        const group = input.groupOf(world);
        const radius = input.radiusOf(world);
        if (!group || radius === undefined) continue;
        group.getWorldPosition(there);
        const distance = there.distanceTo(eye);
        if (distance <= radius) continue;
        bodies.push({
          id: world,
          dir: direction(there),
          radius: Math.asin(Math.min(1, radius / distance)),
        });
      }
      const sky: OcularSky = { brasa, nudo, aligned: input.alignedNow(), bodies };
      return sky;
    },
  };
}
