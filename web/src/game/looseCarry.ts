// Dejar lo que se lleva en cualquier sitio plano (el suelo, una mesa) y volver a cogerlo mirándolo, sin tener que
// llevarlo al encaje exacto que pide su puzle. Une a los puzles que se llevan cosas (campanas, esferas, pesas…) en
// una sola acción de E: con las manos ocupadas y mirando una superficie a tu alcance, «dejar»; con las manos libres y
// mirando algo suelto, «coger». Lógica pura: quien llama pasa adónde se mira.
import type { Vector3 } from 'three';
import type { LoosePose } from './carry';

/** Un puzle que lleva cosas, visto desde fuera. */
export interface LooseCarrier {
  /** El mundo donde está el puzle: lo suelto se queda en su marco. */
  readonly world: string;
  held(): boolean;
  drop(pose: LoosePose): boolean;
  loose(): { id: string; pose: LoosePose }[];
  take(id: string): boolean;
}

/** Adónde mira el jugador en el marco del mundo donde está. */
export interface LooseAim {
  world: string;
  origin: Vector3;
  /** Dirección unitaria de la mirada. */
  direction: Vector3;
  /** Lo primero que toca la mirada, o `undefined` si no toca nada a su alcance. */
  hit: { point: Vector3; normal: Vector3; distance: number } | undefined;
  /** El «arriba» del jugador. */
  up: Vector3;
}

export interface LooseCarry {
  /** Hay algo que dejar o que coger: si no, ni hace falta mirar adónde se apunta. */
  active(): boolean;
  /** El verbo que ofrece ahora («dejar» o «coger»), o `undefined`. */
  verb(aim: LooseAim): 'dejar' | 'coger' | undefined;
  run(aim: LooseAim): void;
}

/** Lo más cerca y lo más lejos (m) a lo que se deja algo, y lo inclinada que puede estar la superficie (cos). */
const MIN_DROP = 0.45;
const MAX_DROP = 3;
const MIN_FLATNESS = 0.5;
/** Para coger algo suelto: a qué distancia (m) de la línea de la mirada puede estar, y cuánto se alcanza. */
const PICK_RADIUS = 0.4;
const PICK_REACH = 3.5;
const PICK_MIN = 0.2;

function dropPose(aim: LooseAim): LoosePose | undefined {
  const { hit } = aim;
  if (!hit || hit.distance < MIN_DROP || hit.distance > MAX_DROP) return undefined;
  if (hit.normal.dot(aim.up) < MIN_FLATNESS) return undefined;
  return {
    position: [hit.point.x, hit.point.y, hit.point.z],
    normal: [hit.normal.x, hit.normal.y, hit.normal.z],
  };
}

export function createLooseCarry(carriers: readonly LooseCarrier[]): LooseCarry {
  /** El objeto suelto más cercano a lo largo de la mirada, con su puzle. */
  function aimedAt(aim: LooseAim): { carrier: LooseCarrier; id: string } | undefined {
    let best: { carrier: LooseCarrier; id: string; along: number } | undefined;
    for (const carrier of carriers) {
      if (carrier.world !== aim.world) continue;
      for (const { id, pose } of carrier.loose()) {
        const [x, y, z] = pose.position;
        const dx = x - aim.origin.x;
        const dy = y - aim.origin.y;
        const dz = z - aim.origin.z;
        const along = dx * aim.direction.x + dy * aim.direction.y + dz * aim.direction.z;
        if (along < PICK_MIN || along > PICK_REACH) continue;
        const off = Math.hypot(
          dx - aim.direction.x * along,
          dy - aim.direction.y * along,
          dz - aim.direction.z * along,
        );
        if (off <= PICK_RADIUS && (!best || along < best.along)) best = { carrier, id, along };
      }
    }
    return best;
  }

  const holder = (): LooseCarrier | undefined => carriers.find((carrier) => carrier.held());

  return {
    active: () => carriers.some((carrier) => carrier.held() || carrier.loose().length > 0),
    verb(aim) {
      const holding = holder();
      if (holding) {
        return holding.world === aim.world && dropPose(aim) ? 'dejar' : undefined;
      }
      return aimedAt(aim) ? 'coger' : undefined;
    },
    run(aim) {
      const holding = holder();
      if (holding) {
        const pose = holding.world === aim.world ? dropPose(aim) : undefined;
        if (pose) holding.drop(pose);
        return;
      }
      const target = aimedAt(aim);
      if (target) target.carrier.take(target.id);
    },
  };
}
