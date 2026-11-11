// El catálogo del cielo (lógica pura, sin GPU): dónde está cada estrella, de qué color y cuánto brilla. Las
// estrellas están en el infinito (solo importa su dirección) y se agolpan, como en un cielo de verdad, a lo
// largo de la banda de la galaxia y hacia su núcleo. Cada sistema la ve desde otro sitio (`SKY_PRESETS`).
import { Vector3 } from 'three';
import type { StarKind } from '../system/systemData';

/** Cómo se ve la galaxia desde un sistema. Los ángulos van en grados. */
export interface SkyPreset {
  seed: number;
  /** Dónde cae el polo norte de la galaxia en el cielo del sistema (latitud y longitud, marco Y arriba). */
  poleLat: number;
  poleLon: number;
  /** Hacia dónde queda el núcleo, girando alrededor del polo. */
  coreTurn: number;
  /** Estrellas sueltas (con brillo y color propios) y polvo de estrellas débiles de la banda. */
  stars: number;
  haze: number;
  /** Anchura de la banda (desviación de la latitud galáctica) y tamaño del bulbo del núcleo. */
  bandWidth: number;
  bulgeSize: number;
  /** Qué parte de las estrellas sueltas sigue la banda (el resto, repartidas por todo el cielo). */
  bandShare: number;
  /** Brillo de la banda difusa (1 = el de casa) y colores (0xRRGGBB): núcleo, brazos y nebulosas. */
  bandGlow: number;
  coreColor: number;
  armColor: number;
  nebulaColor: number;
  /** Segundo tono de nebulosa (las de reflexión, azuladas). */
  reflectionColor: number;
  /** Cuánto oscurecen las franjas de polvo (0–1). */
  dust: number;
}

export const SKY_PRESETS: Readonly<Record<StarKind, SkyPreset>> = {
  // Casa: la banda cruza el cielo inclinada, con un núcleo dorado y nebulosas rosadas sueltas.
  solar: {
    seed: 7,
    poleLat: 28,
    poleLon: 35,
    coreTurn: 200,
    stars: 9000,
    haze: 26000,
    bandWidth: 11,
    bulgeSize: 14,
    bandShare: 0.55,
    bandGlow: 1,
    coreColor: 0xffd9a8,
    armColor: 0xbcc8ff,
    nebulaColor: 0xff6f9a,
    reflectionColor: 0x6fb4ff,
    dust: 0.75,
  },
  // El sistema ajeno, más cerca del centro de la galaxia: el bulbo es enorme, más rojo y más vivo.
  enana_roja: {
    seed: 31,
    poleLat: -52,
    poleLon: 140,
    coreTurn: 70,
    stars: 11000,
    haze: 34000,
    bandWidth: 14,
    bulgeSize: 22,
    bandShare: 0.62,
    bandGlow: 1.35,
    coreColor: 0xffc890,
    armColor: 0xa9c4ff,
    nebulaColor: 0xff5a7e,
    reflectionColor: 0x55d0ff,
    dust: 0.85,
  },
  // Las Puertas, muy lejos de todo: la galaxia es una banda fina y fría, con más nebulosas azules.
  lejana: {
    seed: 113,
    poleLat: 64,
    poleLon: 250,
    coreTurn: 320,
    stars: 8000,
    haze: 20000,
    bandWidth: 7,
    bulgeSize: 10,
    bandShare: 0.5,
    bandGlow: 0.8,
    coreColor: 0xffe2c0,
    armColor: 0xc4d2ff,
    nebulaColor: 0xd07cff,
    reflectionColor: 0x6fd8ff,
    dust: 0.65,
  },
};

/** Las estrellas listas para la GPU. */
export interface StarCatalog {
  count: number;
  /** Direcciones unitarias (x, y, z por estrella). */
  directions: Float32Array;
  /** Color (r, g, b entre 0 y 1). */
  colors: Float32Array;
  /** Brillo relativo (la más brillante, 1). */
  flux: Float32Array;
}

const DEG = Math.PI / 180;
/** Magnitudes de las estrellas sueltas: cuántas más débiles hay por cada paso (pendiente de la cuenta). */
const MAG_RANGE = 7;
const MAG_SLOPE = 0.35;
/** Brillo del polvo de estrellas de la banda, entre estos dos. */
const HAZE_FLUX_MIN = 0.002;
const HAZE_FLUX_MAX = 0.012;
/** Cuántas sueltas caen en el bulbo del núcleo (del total que sigue la banda). */
const BULGE_SHARE = 0.25;

/** Generador pseudoaleatorio con semilla: el cielo es siempre el mismo. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estándar (Box-Muller). */
function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** El polo y el núcleo de la galaxia en el cielo del sistema (unitarios y perpendiculares). */
export function galacticFrame(preset: SkyPreset): { pole: Vector3; core: Vector3 } {
  const lat = preset.poleLat * DEG;
  const lon = preset.poleLon * DEG;
  const pole = new Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(lon),
  );
  // Una dirección cualquiera del plano de la galaxia, girada `coreTurn` alrededor del polo.
  const helper = Math.abs(pole.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const core = new Vector3().crossVectors(helper, pole).normalize();
  core.applyAxisAngle(pole, preset.coreTurn * DEG);
  return { pole, core };
}

/** Latitud galáctica (rad) de una dirección unitaria. */
export function galacticLatitude(direction: Vector3, pole: Vector3): number {
  return Math.asin(Math.max(-1, Math.min(1, direction.dot(pole))));
}

/**
 * Color de un cuerpo negro a `kelvin` (aproximación de Tanner Helland), normalizado para que su componente
 * mayor valga 1. Rojizas por debajo de ~4000 K, blancas hacia 6500 K y azuladas por encima.
 */
export function temperatureColor(kelvin: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  const clamp = (v: number): number => Math.max(0, Math.min(255, v)) / 255;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const rgb: [number, number, number] = [clamp(r), clamp(g), clamp(b)];
  const top = Math.max(...rgb, 1e-6);
  return [rgb[0] / top, rgb[1] / top, rgb[2] / top];
}

/** Temperaturas de las estrellas que se ven a simple vista: muchas amarillas y naranjas, pocas azules. */
const SPECTRAL_BINS: readonly { share: number; min: number; max: number }[] = [
  { share: 0.12, min: 2800, max: 3600 },
  { share: 0.24, min: 3600, max: 5000 },
  { share: 0.24, min: 5000, max: 6000 },
  { share: 0.2, min: 6000, max: 7500 },
  { share: 0.14, min: 7500, max: 12000 },
  { share: 0.06, min: 12000, max: 30000 },
];

function sampleTemperature(random: () => number): number {
  let pick = random();
  for (const bin of SPECTRAL_BINS) {
    if (pick < bin.share) return bin.min + (bin.max - bin.min) * random();
    pick -= bin.share;
  }
  return 6000;
}

/** Algo más de saturación que la física: el cielo se ve vivo sin dejar de parecer real. */
const SATURATION = 1.35;

function vivid([r, g, b]: [number, number, number]): [number, number, number] {
  const grey = (r + g + b) / 3;
  const push = (c: number): number => Math.max(0, Math.min(1, grey + (c - grey) * SATURATION));
  return [push(r), push(g), push(b)];
}

/** Magnitud con más estrellas débiles que brillantes; devuelve el brillo relativo (la más brillante, 1). */
function sampleFlux(random: () => number): number {
  const span = Math.pow(10, MAG_SLOPE * MAG_RANGE) - 1;
  const magnitude = Math.log10(1 + random() * span) / MAG_SLOPE;
  return Math.pow(10, -0.4 * magnitude);
}

interface Frame {
  pole: Vector3;
  core: Vector3;
  side: Vector3;
}

/** Dirección a partir de coordenadas galácticas (rad). */
function fromGalactic(frame: Frame, l: number, b: number, target: Vector3): Vector3 {
  return target
    .copy(frame.core)
    .multiplyScalar(Math.cos(b) * Math.cos(l))
    .addScaledVector(frame.side, Math.cos(b) * Math.sin(l))
    .addScaledVector(frame.pole, Math.sin(b))
    .normalize();
}

/** Una dirección al azar por toda la esfera. */
function uniformDirection(random: () => number, target: Vector3): Vector3 {
  const z = random() * 2 - 1;
  const phi = 2 * Math.PI * random();
  const r = Math.sqrt(1 - z * z);
  return target.set(r * Math.cos(phi), z, r * Math.sin(phi));
}

/** Dónde cae una estrella que sigue la galaxia: en el bulbo o a lo largo de la banda. */
function bandDirection(
  random: () => number,
  frame: Frame,
  preset: SkyPreset,
  target: Vector3,
): Vector3 {
  if (random() < BULGE_SHARE) {
    const l = gaussian(random) * preset.bulgeSize * DEG;
    const b = gaussian(random) * preset.bulgeSize * 0.6 * DEG;
    return fromGalactic(frame, l, b, target);
  }
  const l = random() * 2 * Math.PI;
  // La banda engorda hacia el núcleo (l = 0).
  const width = preset.bandWidth * (0.7 + 0.6 * Math.pow(Math.cos(l / 2), 2));
  return fromGalactic(frame, l, gaussian(random) * width * DEG, target);
}

export function generateStars(preset: SkyPreset): StarCatalog {
  const random = mulberry32(preset.seed);
  const { pole, core } = galacticFrame(preset);
  const frame: Frame = { pole, core, side: new Vector3().crossVectors(pole, core) };
  const count = preset.stars + preset.haze;
  const directions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const flux = new Float32Array(count);
  const direction = new Vector3();
  const coreColor = hexColor(preset.coreColor);
  const armColor = hexColor(preset.armColor);

  for (let i = 0; i < count; i++) {
    const loose = i < preset.stars;
    if (loose) {
      if (random() < preset.bandShare) bandDirection(random, frame, preset, direction);
      else uniformDirection(random, direction);
      flux[i] = sampleFlux(random);
      colors.set(vivid(temperatureColor(sampleTemperature(random))), i * 3);
    } else {
      // El polvo de estrellas: todo en la banda, de un tono entre el del núcleo y el de los brazos.
      bandDirection(random, frame, { ...preset, bandWidth: preset.bandWidth * 0.55 }, direction);
      flux[i] = HAZE_FLUX_MIN + (HAZE_FLUX_MAX - HAZE_FLUX_MIN) * random() * random();
      const nearCore = Math.max(0, direction.dot(core));
      const mix = Math.pow(nearCore, 3);
      colors.set(
        [0, 1, 2].map((c) => (armColor[c] ?? 1) * (1 - mix) + (coreColor[c] ?? 1) * mix),
        i * 3,
      );
    }
    directions.set([direction.x, direction.y, direction.z], i * 3);
  }
  return { count, directions, colors, flux };
}

/** 0xRRGGBB a componentes entre 0 y 1. */
export function hexColor(hex: number): [number, number, number] {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
