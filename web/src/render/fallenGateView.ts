// Lo que se ve de los portales caídos (hito E4 de docs/plan-finales.md §3.2). Las piezas de un anillo caído llevan en
// `userData` su `fallen_lock` (la cerradura del PASO_) y su `fallen_part`: la membrana, que solo se ve encendido y se
// abre poco a poco, y la luz de la hora, que parpadea mientras está apagado y se queda fija al encenderse. Genérico:
// sirve para el Nudo y para cualquier otro portal caído. Las reglas están en game/fallenGatePlay.ts (con tests).
import type { Object3D, Vector3 } from 'three';
import type { FallenGatePlay } from '../game/fallenGatePlay';

interface Piece {
  object: Object3D;
  lock: string;
  part: 'membrane' | 'blink';
  scale: Vector3;
}

/** Lo que se ha encontrado (lo usan las pruebas y la depuración). */
export interface FallenGateViewSnapshot {
  pieces: number;
  locks: string[];
}

export interface FallenGateView {
  /** Una vez por fotograma, con los segundos reales (parpadeo). */
  update(time: number): void;
  snapshot(): FallenGateViewSnapshot;
}

function collect(roots: Iterable<Object3D>): Piece[] {
  const pieces: Piece[] = [];
  for (const root of roots) {
    root.traverse((object) => {
      const lock: unknown = object.userData['fallen_lock'];
      const part: unknown = object.userData['fallen_part'];
      if (typeof lock !== 'string' || (part !== 'membrane' && part !== 'blink')) return;
      pieces.push({ object, lock, part, scale: object.scale.clone() });
    });
  }
  return pieces;
}

export function createFallenGateView(
  roots: Iterable<Object3D>,
  play: FallenGatePlay,
): FallenGateView {
  const pieces = collect(roots).filter((piece) => play.owns(piece.lock));
  return {
    update(time) {
      for (const piece of pieces) {
        const look = play.look(piece.lock, time);
        if (!look) continue;
        if (piece.part === 'blink') {
          piece.object.visible = look.blink;
          continue;
        }
        piece.object.visible = look.membrane > 0;
        piece.object.scale.copy(piece.scale).multiplyScalar(Math.max(1e-3, look.membrane));
      }
    },
    snapshot() {
      return { pieces: pieces.length, locks: [...new Set(pieces.map((p) => p.lock))] };
    },
  };
}
