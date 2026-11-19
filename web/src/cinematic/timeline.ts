// El guion de una cinemática (puro y reutilizable: el final bueno, F3, y los que vengan). Una cinemática es una línea
// de tiempo en segundos con:
//  - planos seguidos, sin huecos, cada uno con su curva de cámara (cameraTrack.ts) y su ritmo (easing.ts);
//  - frases de diálogo con quien las dice (subtítulos con fundido y letras que aparecen a su ritmo);
//  - señales puntuales (`cues`: música, un sonido, un gesto) que quien la reproduce aplica al pasar por ellas;
//  - pistas de números con claves (`tracks`: luz, niebla, fundido, el peso de un gesto…) que se leen en cada fotograma.
// Las coordenadas de la cámara son las que quiera quien la reproduce (por ejemplo, el marco de un sitio del mundo).
import { sampleKeys, type CameraKey, type CameraPose } from './cameraTrack';
import { clamp01, ease, lerp, smoothstep, type Ease } from './easing';
import { itemAt } from './itemAt';

export interface Shot {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  /** Claves con `t` desde el principio del plano (0 … end − start). */
  readonly keys: readonly CameraKey[];
  /** Cómo se reparte el movimiento en el plano; por defecto arranca y frena (`inOut`). */
  readonly ease?: Ease;
  /** El fov de las claves que no lo dicen; por defecto, el de la cinemática. */
  readonly fov?: number;
  /** Con movimiento reducido la cámara no se mueve: se queda en esta clave (por defecto, la última). */
  readonly rest?: number;
}

export interface Line {
  readonly start: number;
  readonly end: number;
  /** Quién lo dice (el reproductor elige su nombre, su signo y su voz). */
  readonly speaker: string;
  /** El texto en español (la clave de la traducción). */
  readonly text: string;
}

export interface Cue {
  readonly at: number;
  readonly id: string;
  /** Deja algo puesto (la música, la luz): se aplica aunque se salte por encima; si no, solo al pasar por ella. */
  readonly persistent?: boolean;
}

export interface ScalarKey {
  readonly t: number;
  readonly v: number;
}

export interface Cinematic {
  readonly id: string;
  readonly duration: number;
  /** Grados (vertical) por defecto. */
  readonly fov: number;
  readonly shots: readonly Shot[];
  readonly lines: readonly Line[];
  readonly cues: readonly Cue[];
  readonly tracks: Readonly<Record<string, readonly ScalarKey[]>>;
}

/** Lo que tarda un subtítulo en aparecer y en irse (s). */
export const SUBTITLE_FADE_IN = 0.35;
export const SUBTITLE_FADE_OUT = 0.6;
const EPSILON = 1e-6;

function checkShots(scene: Cinematic, errors: string[]): void {
  let cursor = 0;
  for (const shot of scene.shots) {
    const length = shot.end - shot.start;
    if (Math.abs(shot.start - cursor) > EPSILON)
      errors.push(
        `el plano ${shot.id} empieza en ${shot.start} y no en ${cursor} (hueco o solape)`,
      );
    if (!(length > 0)) errors.push(`el plano ${shot.id} no dura nada`);
    if (shot.keys.length === 0) errors.push(`el plano ${shot.id} no tiene claves`);
    shot.keys.forEach((key, index) => {
      const previous = shot.keys[index - 1]?.t ?? -Infinity;
      if (!(key.t > previous)) errors.push(`el plano ${shot.id}: las claves no van en orden`);
      if (key.t < 0 || key.t > length + EPSILON)
        errors.push(`el plano ${shot.id}: la clave en ${key.t} s cae fuera del plano`);
    });
    if (shot.rest !== undefined && !(shot.rest >= 0 && shot.rest < shot.keys.length))
      errors.push(`el plano ${shot.id}: rest ${shot.rest} no es una clave`);
    cursor = shot.end;
  }
  if (Math.abs(cursor - scene.duration) > EPSILON)
    errors.push(`los planos acaban en ${cursor} y la cinemática dura ${scene.duration}`);
}

function checkLines(scene: Cinematic, errors: string[]): void {
  scene.lines.forEach((line, index) => {
    if (!(line.end > line.start)) errors.push(`la frase ${index} acaba antes de empezar`);
    if (line.start < 0 || line.end > scene.duration)
      errors.push(`la frase ${index} cae fuera de la cinemática`);
    const previous = index > 0 ? scene.lines[index - 1] : undefined;
    if (previous && line.start < previous.end)
      errors.push(`la frase ${index} se solapa con la anterior`);
    if (line.text.trim() === '') errors.push(`la frase ${index} está vacía`);
  });
}

/** Los fallos del guion (vacío si está bien): se comprueba en los tests de cada cinemática. */
export function validateCinematic(scene: Cinematic): string[] {
  const errors: string[] = [];
  if (!(scene.duration > 0)) errors.push('la cinemática no dura nada');
  if (scene.shots.length === 0) errors.push('la cinemática no tiene planos');
  checkShots(scene, errors);
  checkLines(scene, errors);
  for (const cue of scene.cues) {
    if (!(cue.at >= 0 && cue.at <= scene.duration))
      errors.push(`la señal ${cue.id} cae fuera de la cinemática`);
  }
  for (const [name, keys] of Object.entries(scene.tracks)) {
    if (keys.length === 0) errors.push(`la pista ${name} está vacía`);
    keys.forEach((key, index) => {
      if (!(key.t > (keys[index - 1]?.t ?? -Infinity)))
        errors.push(`la pista ${name}: las claves no van en orden`);
    });
  }
  return errors;
}

export interface ShotAt {
  readonly shot: Shot;
  readonly index: number;
  /** Segundos desde el principio del plano. */
  readonly local: number;
}

/** El plano de ese momento (antes de empezar, el primero; después de acabar, el último). */
export function shotAt(scene: Cinematic, time: number): ShotAt {
  const clamped = Math.min(Math.max(time, 0), scene.duration);
  let index = scene.shots.findIndex((shot) => clamped < shot.end);
  if (index < 0) index = scene.shots.length - 1;
  const shot = itemAt(scene.shots, index);
  return { shot, index, local: clamped - shot.start };
}

/** Dónde está la cámara; con movimiento reducido, quieta en la clave de reposo de cada plano (los cortes siguen). */
export function cameraAt(scene: Cinematic, time: number, reducedMotion = false): CameraPose {
  const { shot, local } = shotAt(scene, time);
  const fov = shot.fov ?? scene.fov;
  if (reducedMotion) {
    const rest = itemAt(shot.keys, shot.rest ?? shot.keys.length - 1);
    return sampleKeys(shot.keys, rest.t, fov);
  }
  const length = shot.end - shot.start;
  return sampleKeys(shot.keys, ease(shot.ease ?? 'inOut', local / length) * length, fov);
}

/** El principio del plano siguiente (o el final de la cinemática). */
export function nextShotStart(scene: Cinematic, time: number): number {
  const { index } = shotAt(scene, time);
  const next = scene.shots[index + 1];
  return next ? next.start : scene.duration;
}

export interface SubtitleAt {
  readonly line: Line;
  /** 0–1: entra y sale con un fundido. */
  readonly alpha: number;
}

export function subtitleAt(scene: Cinematic, time: number): SubtitleAt | undefined {
  const line = scene.lines.find((candidate) => time >= candidate.start && time < candidate.end);
  if (!line) return undefined;
  const fadeIn = clamp01((time - line.start) / SUBTITLE_FADE_IN);
  const fadeOut = clamp01((line.end - time) / SUBTITLE_FADE_OUT);
  return { line, alpha: Math.min(fadeIn, fadeOut) };
}

/** Cuántas letras de la frase se ven ya (la voz de letras suena con cada par nuevo). */
export function revealedLetters(line: Line, time: number, lettersPerSecond: number): number {
  const length = Array.from(line.text).length;
  if (lettersPerSecond === Infinity) return time >= line.start ? length : 0;
  const shown = Math.floor((time - line.start) * lettersPerSecond + EPSILON);
  return Math.min(length, Math.max(0, shown));
}

/** El valor de una pista en ese momento (subida suave entre claves); sin la pista o sin claves, `fallback`. */
export function trackValue(scene: Cinematic, name: string, time: number, fallback = 0): number {
  const keys = scene.tracks[name]; // undefined si no existe
  const first = keys?.[0];
  if (!keys || !first) return fallback;
  if (time <= first.t) return first.v;
  const last = itemAt(keys, keys.length - 1);
  if (time >= last.t) return last.v;
  let index = 0;
  while (time >= itemAt(keys, index + 1).t) index += 1;
  const from = itemAt(keys, index);
  const to = itemAt(keys, index + 1);
  return lerp(from.v, to.v, smoothstep(from.t, to.t, time));
}

/**
 * Las señales entre `from` (sin incluir) y `to` (incluido), en orden. Si se saltó por encima (`jumped`), solo las que
 * dejan algo puesto: un gesto o un sonido de un momento que no se vio no se dispara.
 */
export function cuesBetween(scene: Cinematic, from: number, to: number, jumped = false): Cue[] {
  return scene.cues
    .filter((cue) => cue.at > from && cue.at <= to && (!jumped || cue.persistent === true))
    .sort((a, b) => a.at - b.at);
}
