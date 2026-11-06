// El ocular del telescopio del Observatorio (🟡, pedido de Anthony 2026-11-05): lo que se ve por él, como lógica pura.
// El jugador mueve el campo por el cielo, acerca la vista y gira el índice de corrección; durante la alineación de las
// 6:30 la imagen del Nudo se ve limpia (torcida hacia la Brasa) y, donde de verdad está, las estrellas de detrás se
// doblan en un anillo muy fino. Con el índice a la corrección correcta, la marca cae sobre ese anillo: poner la cruz
// ahí da el rumbo verdadero del Nudo, medido desde el sitio más lejano del sistema. Ui/ocularBody.ts lo dibuja.
import { Vector3 } from 'three';
import { LENS_DEFLECTION, apparentDirection, einsteinRadius, lensedAngle } from '../system/lens';

const DEG = Math.PI / 180;
/** Campo de visión (vertical, grados) de cada aumento: amplio, medio y fino. */
export const ZOOM_FIELDS: readonly number[] = [48, 14, 3.2];
/** Con este aumento (o más) se ve el anillo de las estrellas: de menos, es demasiado fino. */
export const RING_ZOOM = 2;
/** Lo que se puede girar el índice de corrección (grados) y de cuánto en cuánto. */
export const DIAL_MIN = 0;
export const DIAL_MAX = 40;
export const DIAL_STEP = 1;
/** Cuánto se tolera el índice y la cruz para dar el rumbo por bueno (grados). */
const DIAL_TOLERANCE = 1.2;
const CROSS_TOLERANCE = 0.45;
/** Cuánto hay que mantener la cruz sobre el anillo (s). */
export const HOLD_SECONDS = 1.6;
/** Estrellas del fondo: las mismas siempre (semilla fija) y repartidas por toda la esfera. */
const STAR_COUNT = 900;

export interface OcularBody {
  id: string;
  /** Dirección unitaria desde el telescopio, en el marco de la escena. */
  dir: Vector3;
  /** Radio angular (rad). */
  radius: number;
}

/** Lo que el juego dice del cielo en este momento (en el marco de la escena, desde el telescopio). */
export interface OcularSky {
  /** Dirección de la Brasa. */
  brasa: Vector3;
  /** Dirección verdadera del Nudo y a cuántos metros está; `undefined` si no hay Nudo en este sistema. */
  nudo: { dir: Vector3; distance: number } | undefined;
  /** La alineación está en curso. */
  aligned: boolean;
  /** Los demás mundos a la vista. */
  bodies: readonly OcularBody[];
}

export interface OcularView {
  /** Cuánto se ha girado desde la Brasa, a los lados y arriba (rad). */
  yaw: number;
  pitch: number;
  /** Índice en `ZOOM_FIELDS`. */
  zoom: number;
  /** Índice de corrección (grados). */
  dial: number;
}

export const HOME_VIEW: OcularView = { yaw: 0, pitch: 0, zoom: 0, dial: 0 };

export interface Basis {
  forward: Vector3;
  right: Vector3;
  up: Vector3;
}

/** Los ejes del campo cuando se mira hacia `forward` (el "arriba" del cielo es +Y de la escena). */
export function basisOf(forward: Vector3): Basis {
  const f = forward.clone().normalize();
  const reference = Math.abs(f.y) > 0.98 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(f, reference).normalize();
  const up = new Vector3().crossVectors(right, f).normalize();
  return { forward: f, right, up };
}

/** Hacia dónde mira el ocular: la Brasa, girada `yaw` a un lado y `pitch` hacia arriba. */
export function viewBasis(view: OcularView, sky: OcularSky): Basis {
  const home = basisOf(sky.brasa);
  const forward = home.forward
    .clone()
    .addScaledVector(home.right, Math.tan(view.yaw))
    .addScaledVector(home.up, Math.tan(view.pitch) / Math.cos(view.yaw))
    .normalize();
  return basisOf(forward);
}

/** Dónde cae una dirección en el campo (−1 a 1 en cada eje, el centro es 0), o `undefined` si queda fuera del campo. */
export function project(
  basis: Basis,
  view: OcularView,
  dir: Vector3,
): [number, number] | undefined {
  const depth = dir.dot(basis.forward);
  if (depth <= 0.01) return undefined;
  const half = Math.tan(((ZOOM_FIELDS[view.zoom] ?? 48) * DEG) / 2);
  const x = dir.dot(basis.right) / depth / half;
  const y = dir.dot(basis.up) / depth / half;
  return Math.abs(x) > 1.15 || Math.abs(y) > 1.15 ? undefined : [x, y];
}

/** Gira `v` un ángulo (positivo: hacia `target`) alrededor del eje que une los dos. */
function turn(v: Vector3, target: Vector3, angle: number): Vector3 {
  const axis = new Vector3().crossVectors(v, target);
  if (axis.lengthSq() < 1e-12) return v.clone();
  return v.clone().applyAxisAngle(axis.normalize(), angle);
}

/** Dónde se VE la imagen del Nudo (girada hacia la Brasa), o `undefined` si se pierde en el resplandor. */
export function imageDirection(sky: OcularSky): Vector3 | undefined {
  return sky.nudo ? apparentDirection(sky.nudo.dir, sky.brasa) : undefined;
}

/** La marca del índice: la imagen girada, alejándose de la Brasa, los grados que marca el índice. */
export function dialMarker(sky: OcularSky, dial: number): Vector3 | undefined {
  const image = imageDirection(sky);
  return image ? turn(image, sky.brasa, -dial * DEG) : undefined;
}

/** Ángulo (grados) entre dos direcciones. */
export function separation(a: Vector3, b: Vector3): number {
  return a.angleTo(b) / DEG;
}

/** El índice está donde debe (la corrección que se aprende en Cicatriz y que aquí se comprueba con el cielo). */
export function dialIsRight(dial: number): boolean {
  return Math.abs(dial - LENS_DEFLECTION / DEG) <= DIAL_TOLERANCE;
}

/** ¿Está la cruz sobre el anillo de las estrellas, con el índice bien puesto y el aumento suficiente? */
export function onTarget(view: OcularView, sky: OcularSky): boolean {
  if (!sky.aligned || !sky.nudo || view.zoom < RING_ZOOM || !dialIsRight(view.dial)) return false;
  const basis = viewBasis(view, sky);
  return separation(basis.forward, sky.nudo.dir) <= CROSS_TOLERANCE;
}

/** Cuánto lleva sostenida la cruz sobre el anillo: `held` sube con la cruz puesta y baja si se aparta. */
export function stepHold(held: number, locked: boolean, dt: number): number {
  return locked ? Math.min(HOLD_SECONDS, held + dt) : Math.max(0, held - dt * 2);
}

/** El rumbo que da el ocular al fijar el Nudo: su distancia angular a la Brasa (grados). */
export function nudoBearing(sky: OcularSky): number | undefined {
  return sky.nudo ? separation(sky.nudo.dir, sky.brasa) : undefined;
}

// ---- Estrellas --------------------------------------------------------------------------------------------

/** Una estrella del fondo: su dirección y su brillo (0 a 1). */
export interface Star {
  dir: Vector3;
  light: number;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** El fondo de estrellas: fijo siempre, para que dos miradas al mismo sitio vean lo mismo. */
export function starField(count = STAR_COUNT): Star[] {
  const random = seededRandom(97);
  return Array.from({ length: count }, () => {
    const z = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    return {
      dir: new Vector3(ring * Math.cos(a), z, ring * Math.sin(a)),
      light: 0.25 + random() * random() * 0.75,
    };
  });
}

/** Dónde se ve una estrella con el Nudo en medio: empujada hacia fuera, como con una lente de verdad. */
export function bentStar(star: Vector3, nudo: { dir: Vector3; distance: number }): Vector3 {
  const theta = star.angleTo(nudo.dir);
  if (theta < 1e-5) return star.clone();
  const einstein = einsteinRadius(nudo.distance);
  const apparent = lensedAngle(theta, einstein);
  // Se aparta del Nudo por el círculo máximo que los une.
  return turn(star, nudo.dir, theta - apparent);
}

/** Estrellas del fondo en torno a una dirección (hasta `PATCH_RADIUS` grados): lo bastante densas para que el anillo se vea. */
const PATCH_STARS = 520;
const PATCH_RADIUS = 4 * DEG;
const patchOffsets: readonly { theta: number; phi: number; light: number }[] = (() => {
  const random = seededRandom(131);
  return Array.from({ length: PATCH_STARS }, () => ({
    // Reparto uniforme por superficie dentro del casquete.
    theta: PATCH_RADIUS * Math.sqrt(random()),
    phi: random() * Math.PI * 2,
    light: 0.3 + random() * random() * 0.7,
  }));
})();

/** El parche de estrellas que rodea al Nudo (antes de doblarse), puesto en su dirección. */
export function patchStars(around: Vector3): Star[] {
  const { forward, right, up } = basisOf(around);
  return patchOffsets.map(({ theta, phi, light }) => ({
    dir: forward
      .clone()
      .multiplyScalar(Math.cos(theta))
      .addScaledVector(right, Math.sin(theta) * Math.cos(phi))
      .addScaledVector(up, Math.sin(theta) * Math.sin(phi))
      .normalize(),
    light,
  }));
}
