// La curva de cámara de un plano (puro): claves con tiempo, posición, punto al que mira, fov y alabeo. La posición y
// el punto siguen una Catmull-Rom con los tiempos de las claves como nudos (Barry-Goldman), así que la cámara pasa
// por cada clave sin acelerar ni frenar de golpe aunque las claves no estén repartidas igual. El fov y el alabeo
// van de una clave a otra con una subida suave (no se pasan nunca).
import { lerp, smoothstep } from './easing';
import { itemAt } from './itemAt';

export type Vec3 = readonly [number, number, number];

export interface CameraKey {
  /** Segundos desde el principio del plano. */
  readonly t: number;
  readonly pos: Vec3;
  /** Adónde mira. */
  readonly look: Vec3;
  /** Grados (vertical); sin él, el de la clave anterior. */
  readonly fov?: number;
  /** Alabeo (rad) alrededor del eje de la mirada; sin él, el de la clave anterior (0 al principio). */
  readonly roll?: number;
}

export interface CameraPose {
  readonly pos: Vec3;
  readonly look: Vec3;
  readonly fov: number;
  readonly roll: number;
}

type Pick = (key: CameraKey) => Vec3;

function mix(a: Vec3, b: Vec3, u: number): Vec3 {
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
}

function reflect(edge: Vec3, inner: Vec3): Vec3 {
  return [2 * edge[0] - inner[0], 2 * edge[1] - inner[1], 2 * edge[2] - inner[2]];
}

/** Barry-Goldman: Catmull-Rom con nudos t0 < t1 ≤ t ≤ t2 < t3. */
function catmull(
  points: readonly [Vec3, Vec3, Vec3, Vec3],
  knots: readonly [number, number, number, number],
  t: number,
): Vec3 {
  const [p0, p1, p2, p3] = points;
  const [t0, t1, t2, t3] = knots;
  const a1 = mix(p0, p1, (t - t0) / (t1 - t0));
  const a2 = mix(p1, p2, (t - t1) / (t2 - t1));
  const a3 = mix(p2, p3, (t - t2) / (t3 - t2));
  const b1 = mix(a1, a2, (t - t0) / (t2 - t0));
  const b2 = mix(a2, a3, (t - t1) / (t3 - t1));
  return mix(b1, b2, (t - t1) / (t2 - t1));
}

function curveAt(keys: readonly CameraKey[], index: number, t: number, pick: Pick): Vec3 {
  const k1 = itemAt(keys, index);
  const k2 = itemAt(keys, index + 1);
  const span = k2.t - k1.t;
  const before = keys[index - 1];
  const after = keys[index + 2];
  const p0 = before ? pick(before) : reflect(pick(k1), pick(k2));
  const p3 = after ? pick(after) : reflect(pick(k2), pick(k1));
  const t0 = before ? before.t : k1.t - span;
  const t3 = after ? after.t : k2.t + span;
  return catmull([p0, pick(k1), pick(k2), p3], [t0, k1.t, k2.t, t3], t);
}

/** El fov o el alabeo de cada clave, heredando el anterior cuando una clave no lo dice. */
function carried(
  keys: readonly CameraKey[],
  field: 'fov' | 'roll',
  fallback: number,
): readonly number[] {
  const values: number[] = [];
  let current = fallback;
  for (const key of keys) {
    current = key[field] ?? current;
    values.push(current);
  }
  return values;
}

/** Dónde está la cámara a los `time` segundos del plano (claves ordenadas por tiempo, al menos una). */
export function sampleKeys(
  keys: readonly CameraKey[],
  time: number,
  fallbackFov: number,
): CameraPose {
  const fovs = carried(keys, 'fov', fallbackFov);
  const rolls = carried(keys, 'roll', 0);
  const still = (index: number): CameraPose => {
    const key = itemAt(keys, index);
    return { pos: key.pos, look: key.look, fov: itemAt(fovs, index), roll: itemAt(rolls, index) };
  };
  const lastIndex = keys.length - 1;
  if (lastIndex === 0 || time <= itemAt(keys, 0).t) return still(0);
  if (time >= itemAt(keys, lastIndex).t) return still(lastIndex);
  let index = 0;
  while (index < lastIndex - 1 && time >= itemAt(keys, index + 1).t) index += 1;
  const u = smoothstep(itemAt(keys, index).t, itemAt(keys, index + 1).t, time);
  return {
    pos: curveAt(keys, index, time, (key) => key.pos),
    look: curveAt(keys, index, time, (key) => key.look),
    fov: lerp(itemAt(fovs, index), itemAt(fovs, index + 1), u),
    roll: lerp(itemAt(rolls, index), itemAt(rolls, index + 1), u),
  };
}
