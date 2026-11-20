// La cámara del tráiler: una ruta por fotogramas clave (posición, punto al que mira y campo de visión), en
// coordenadas locales del mundo de la toma. Entre claves se interpola con Catmull-Rom (curvas suaves que pasan
// por cada clave) y el tiempo de la toma entra y sale suave. Aquí solo hay lógica pura.

export type Vec3 = readonly [number, number, number];

export interface CameraKey {
  /** Segundo de la toma en que la cámara pasa por aquí. */
  t: number;
  pos: Vec3;
  look: Vec3;
  /** Campo de visión vertical en grados; si falta, el de la clave anterior (o el del juego). */
  fov?: number;
}

export interface CameraSample {
  pos: Vec3;
  look: Vec3;
  fov: number;
}

/** Campo de visión por defecto si ninguna clave lo da (el del juego en primera persona). */
export const DEFAULT_FOV = 70;

/** Entrada y salida suaves (0→0, 1→1, pendiente nula en los extremos). */
export function smoothstep(x: number): number {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
  );
}

function curve(a: Vec3, b: Vec3, c: Vec3, d: Vec3, u: number): Vec3 {
  return [
    catmullRom(a[0], b[0], c[0], d[0], u),
    catmullRom(a[1], b[1], c[1], d[1], u),
    catmullRom(a[2], b[2], c[2], d[2], u),
  ];
}

/** Los fov de cada clave, rellenando los que faltan con el anterior. */
function fovs(keys: readonly CameraKey[]): number[] {
  let last = DEFAULT_FOV;
  return keys.map((key) => (last = key.fov ?? last));
}

/** Valida una ruta: al menos una clave, tiempos crecientes y números finitos. Lanza con un mensaje claro. */
export function validatePath(keys: readonly CameraKey[]): void {
  if (keys.length === 0) throw new Error('La ruta de cámara no tiene fotogramas clave');
  keys.forEach((key, i) => {
    const numbers = [key.t, ...key.pos, ...key.look, key.fov ?? DEFAULT_FOV];
    if (!numbers.every(Number.isFinite))
      throw new Error(`La clave ${String(i)} tiene números no válidos`);
    const before = keys[i - 1];
    if (before && key.t <= before.t)
      throw new Error(`La clave ${String(i)} no va después de la anterior`);
  });
}

/**
 * Dónde está la cámara en el segundo `time` de la toma. Antes de la primera clave se queda en ella y después de
 * la última, también. Con `ease`, el tiempo total entra y sale suave (la cámara arranca y frena sin tirón).
 */
export function sampleAt(keys: readonly CameraKey[], time: number, ease = true): CameraSample {
  validatePath(keys);
  const first = keys[0] as CameraKey;
  const last = keys[keys.length - 1] as CameraKey;
  const fov = fovs(keys);
  const span = last.t - first.t;
  if (span <= 0) return { pos: first.pos, look: first.look, fov: fov[0] as number };
  const raw = Math.min(Math.max((time - first.t) / span, 0), 1);
  const t = first.t + (ease ? smoothstep(raw) : raw) * span;
  let i = 0;
  while (i < keys.length - 2 && t > (keys[i + 1] as CameraKey).t) i += 1;
  const k1 = keys[i] as CameraKey;
  const k2 = keys[i + 1] as CameraKey;
  const k0 = keys[i - 1] ?? k1;
  const k3 = keys[i + 2] ?? k2;
  const u = (t - k1.t) / (k2.t - k1.t);
  const f1 = fov[i] as number;
  const f2 = fov[i + 1] as number;
  return {
    pos: curve(k0.pos, k1.pos, k2.pos, k3.pos, u),
    look: curve(k0.look, k1.look, k2.look, k3.look, u),
    fov: f1 + (f2 - f1) * u,
  };
}

/** Cuántos fotogramas tiene una toma de `seconds` a `fps` (al menos uno). */
export function frameCount(seconds: number, fps: number): number {
  return Math.max(1, Math.round(seconds * fps));
}
