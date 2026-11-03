// Umbral, la llegada (CONTEXTO_PLANETAS.md §3), modelado por código (Fase 11). Sustituye a
// blender/scripts/arte_umbral.py y a umbral.glb: misma distribución (latitudes, longitudes y rumbos) y el mismo
// contrato que el modelo exportado (raíz con radio, gravedad y reloj; mallas COL_; marcas INT_, SPAWN_, PARK_,
// TRIG_ y EVT_), así que el resto del juego no nota la diferencia.
//
// Gramática de los Ausentes: anillos y estratos, arenisca clara, metal pizarra, luz ámbar.
import {
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import systemData from '../../data/sistema.json';
import { parseSystem } from '../../system/systemData';
import { isMesh } from '../markers';
import { WORLD_IDS } from '../worldSelection';
import {
  angleBetween,
  applySkyLight,
  ball,
  box,
  clamp,
  colliderMesh,
  cone,
  cylinder,
  direction,
  frameAt,
  geometryFrom,
  headingTowards,
  latLon,
  marker,
  PieceSet,
  piecesToMeshes,
  rampMatrix,
  scatter,
  smoothstep,
  sphereTerrain,
  torus,
  torusArc,
  triangleCount,
  uprightRotation,
  type Frame,
  type PlaceOptions,
  type Surface,
  type Triple,
  type XYZ,
} from './kit';
import { createNoise, fbm, ridged, seededRandom, type Random } from './noise';

export const UMBRAL_ID = 'umbral';
export const UMBRAL_RADIUS = 90;
/** Subdivisión del terreno: ≈ 48 mil triángulos (presupuesto orientativo, ver CONTEXTO_PLANETAS.md §2). */
export const UMBRAL_DETAIL = 48;

const DEG = Math.PI / 180;

export const PALETTE = {
  sandstone: '#D8C49A',
  sandstoneLight: '#E6D7B2',
  sandstoneShade: '#B8A27A',
  deepSand: '#C2AA80',
  pathSand: '#B49A72',
  rock: '#7A6A5E',
  rockLight: '#968270',
  rockDark: '#5C4E46',
  ochre: '#B87A3A',
  ochreLight: '#C99B5E',
  amber: '#E0A040',
  slate: '#3A3A48',
  slateLight: '#4C4C5C',
  violet: '#3A2850',
  porcelain: '#E8E0D0',
  bread: '#C88A40',
  fruit: '#A04030',
  paper: '#EDE4CC',
  cloth: '#6A4A5A',
  ice: '#A8D0E8',
  iceLight: '#D4E9F3',
  tuft: '#B89650',
  tuftDry: '#9C7E48',
  light: '#FFC070',
} as const;
const P = PALETTE;

/** Estratos de las mesas de roca, de abajo arriba. */
const STRATA = ['#C9A57A', '#B48A62', '#D6BA8E', '#A47A56', '#C2966C', '#9A7458'] as const;
/** Brillo de las luces ámbar (no dependen de la Brasa). */
const LAMP_GLOW = 3;

/** Dirección de la Brasa en el marco de Umbral (rotación bloqueada: siempre la misma cara). */
export function sunInUmbral(): Vector3 {
  const body = parseSystem(systemData, WORLD_IDS).bodyOf(UMBRAL_ID);
  const c = body?.spinPhase ?? 0;
  // En glTF (Y arriba) la Brasa queda en (−cos c, 0, −sin c); en el marco de Blender, (−cos c, sin c, 0).
  return new Vector3(-Math.cos(c), Math.sin(c), 0);
}

// ---- Relieve ----------------------------------------------------------------------------------------------

const noise = createNoise(7);
const noise2 = createNoise(31);

/** El único macizo: una mesa de estratos lejos de los lugares (✅ Anthony, 2026-10-31). */
const MASSIF = { lat: 35, lon: 70, radius: 26 } as const;
const MASSIF_DIR = direction(MASSIF.lat, MASSIF.lon);

interface Pad {
  d: Vector3;
  radius: number;
  falloff: number;
  height: number;
}

interface Path {
  a: Vector3;
  b: Vector3;
  normal: Vector3;
  length: number;
}

interface Footprint {
  d: Vector3;
  radius: number;
}

/** 1 al pie del macizo, 0 a unos 16 m de él: la ladera de derrubios. */
function massifSlope(x: number, y: number, z: number): number {
  const distance =
    angleBetween({ x, y, z }, MASSIF_DIR) * UMBRAL_RADIUS + noise(x * 4, y * 4, z * 4) * 3;
  return clamp(1 - (distance - MASSIF.radius * 0.8) / 16, 0, 1);
}

function iceCap(z: number, x: number, y: number): number {
  const lat = Math.abs(Math.asin(clamp(z, -1, 1))) / DEG;
  return smoothstep(66, 73, lat + noise(x * 5, y * 5, z * 5) * 5);
}

function baseHeight(x: number, y: number, z: number): number {
  let h = fbm(noise, x * 1.3, y * 1.3, z * 1.3, 4) * 2.0;
  h += noise(x * 7, y * 7, z * 7) * 0.25;
  const slope = massifSlope(x, y, z);
  if (slope > 0)
    h += 3.5 * slope * slope * (0.7 + 0.5 * ridged(noise2, x * 3.2 + 5, y * 3.2, z * 3.2));
  const ice = iceCap(z, x, y);
  if (ice > 0) h += ice * (0.7 + 0.9 * Math.abs(fbm(noise, x * 9, y * 9, z * 9, 2)));
  return h;
}

/** El relieve con sus explanadas (el suelo se allana bajo los lugares) y los caminos. */
class Relief implements Surface {
  readonly radius = UMBRAL_RADIUS;
  readonly pads: Pad[] = [];
  readonly paths: Path[] = [];
  readonly footprints: Footprint[] = [];

  addPad(lat: number, lon: number, radius: number, falloff = 5): void {
    const d = direction(lat, lon);
    const samples = [baseHeight(d.x, d.y, d.z)];
    const degrees = (radius * 0.6) / UMBRAL_RADIUS / DEG;
    for (let k = 0; k < 8; k++) {
      const a = (2 * Math.PI * k) / 8;
      const p = direction(
        lat + degrees * Math.cos(a),
        lon + (degrees * Math.sin(a)) / Math.max(0.2, Math.cos(lat * DEG)),
      );
      samples.push(baseHeight(p.x, p.y, p.z));
    }
    this.pads.push({
      d,
      radius,
      falloff,
      height: samples.reduce((s, v) => s + v, 0) / samples.length,
    });
  }

  addPath(a: Vector3, b: Vector3): void {
    this.paths.push({ a, b, normal: a.clone().cross(b).normalize(), length: angleBetween(a, b) });
  }

  height(x: number, y: number, z: number): number {
    let h = baseHeight(x, y, z);
    const d = { x, y, z };
    for (const pad of this.pads) {
      const distance = angleBetween(d, pad.d) * UMBRAL_RADIUS;
      if (distance < pad.radius + pad.falloff) {
        h += (pad.height - h) * (1 - smoothstep(pad.radius, pad.radius + pad.falloff, distance));
      }
    }
    return h;
  }

  groundRadius(d: XYZ): number {
    const l = Math.hypot(d.x, d.y, d.z) || 1;
    return UMBRAL_RADIUS + this.height(d.x / l, d.y / l, d.z / l);
  }

  /** Distancia (m) de una dirección al tramo de camino. */
  pathDistance(d: XYZ, path: Path): number {
    const s = d.x * path.normal.x + d.y * path.normal.y + d.z * path.normal.z;
    const projected = new Vector3(d.x, d.y, d.z).addScaledVector(path.normal, -s).normalize();
    if (angleBetween(path.a, projected) + angleBetween(projected, path.b) <= path.length + 1e-4) {
      return Math.asin(Math.abs(s)) * UMBRAL_RADIUS;
    }
    return Math.min(angleBetween(d, path.a), angleBetween(d, path.b)) * UMBRAL_RADIUS;
  }

  /** 1 en mitad de un camino, 0 fuera. */
  onPath(x: number, y: number, z: number): number {
    let t = 0;
    for (const path of this.paths) {
      const width = 1.15 + noise(x * 11, y * 11, z * 11) * 0.45;
      t = Math.max(t, 1 - smoothstep(width * 0.55, width, this.pathDistance({ x, y, z }, path)));
    }
    return t;
  }

  /** Libre de lugares (con margen) y de mesas de roca. */
  isFree(d: XYZ, margin: number): boolean {
    return (
      !this.pads.some((p) => angleBetween(d, p.d) * UMBRAL_RADIUS < p.radius + margin) &&
      !this.footprints.some((f) => angleBetween(d, f.d) * UMBRAL_RADIUS < f.radius)
    );
  }
}

const color = new Color();
const mix = new Color();

function groundColor(
  relief: Relief,
  x: number,
  y: number,
  z: number,
  h: number,
  slope: number,
  random: Random,
): Color {
  const vary = (random() - 0.5) * 0.05; // facetas: cada cara un pelo distinta
  const n = fbm(noise, x * 3.1, y * 3.1, z * 3.1, 3);
  color.set(P.sandstone).lerp(mix.set(P.deepSand), clamp(0.5 - n * 1.4, 0, 1));
  const patches = fbm(noise, x * 1.7 + 9, y * 1.7, z * 1.7, 3);
  if (patches > 0.18) color.lerp(mix.set(P.ochreLight), smoothstep(0.18, 0.42, patches) * 0.75);
  if (h < -0.9) color.lerp(mix.set(P.sandstoneShade), smoothstep(-0.9, -1.8, h));
  const path = relief.onPath(x, y, z);
  if (path > 0) color.lerp(mix.set(P.pathSand), path * 0.5);
  if (slope > 0.3) color.lerp(mix.set(P.rock), smoothstep(0.3, 0.6, slope) * 0.6);
  const talus = massifSlope(x, y, z);
  if (talus > 0) color.lerp(mix.set(random() < 0.5 ? P.rockLight : P.sandstoneShade), talus * 0.55);
  const ice = iceCap(z, x, y);
  if (ice > 0) color.lerp(mix.set(random() < 0.5 ? P.ice : P.iceLight), ice);
  return color.offsetHSL(0, 0, vary);
}

// ---- Los lugares ------------------------------------------------------------------------------------------

interface Site extends PlaceOptions {
  lat: number;
  lon: number;
}

function sites(
  sun: Vector3,
): Record<'mouth' | 'dock' | 'booth' | 'lookout' | 'classroom' | 'plaza', Site> {
  return {
    mouth: { lat: 8, lon: 22.5, heading: 90, footprint: 8.5, ground: 'mean' },
    dock: { lat: -5, lon: 40, heading: 300, footprint: 6, ground: 'mean' },
    booth: { lat: 3, lon: 60, heading: 270, footprint: 2.2, sink: 0.2 },
    lookout: {
      lat: 24,
      lon: 10,
      heading: headingTowards(24, 10, sun),
      footprint: 3.5,
      ground: 'mean',
    },
    classroom: { lat: -15, lon: 110, heading: 200, footprint: 4.5, sink: 0.3 },
    plaza: { lat: 5, lon: 150, footprint: 2 },
  };
}

/** Dónde espera la nave (blender/marcas/umbral.json): suelo llano y despejado. */
const SHIP_PARK = { lat: 1, lon: 27 } as const;

function houseSpots(plaza: Site): { lat: number; lon: number }[] {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (2 * Math.PI * k) / 6 + 0.3;
    return {
      lat: plaza.lat + (9 * Math.cos(a)) / UMBRAL_RADIUS / DEG,
      lon: plaza.lon + (9 * Math.sin(a)) / UMBRAL_RADIUS / DEG / Math.cos(plaza.lat * DEG),
    };
  });
}

/** Una marca en un marco: su posición y su giro (Z arriba, +Y hacia el rumbo del lugar). */
interface MarkerSpec {
  name: string;
  frame: Frame;
  at: Triple;
  props?: Record<string, string | number>;
}

class UmbralBuilder {
  readonly pieces = new PieceSet(3);
  readonly flash = new PieceSet(5);
  readonly markers: MarkerSpec[] = [];
  readonly site: ReturnType<typeof sites>;

  constructor(
    readonly relief: Relief,
    sun: Vector3,
  ) {
    this.site = sites(sun);
  }

  place(s: PlaceOptions & { lat: number; lon: number }): Frame {
    return frameAt(this.relief, s.lat, s.lon, s);
  }

  lamp(f: Frame, x: number, y: number, z = 0): void {
    const v = this.pieces;
    v.add(P.rock, cylinder(0.2, 6), f.at([x, y, z + 0.1], undefined, [1, 1, 0.2]));
    v.add(P.slate, cylinder(0.07, 6), f.at([x, y, z + 1.3], undefined, [1, 1, 2.4]), 'metal', {
      solid: true,
    });
    v.add(P.slate, cylinder(0.17, 8), f.at([x, y, z + 2.44], undefined, [1, 1, 0.06]), 'metal');
    v.add(P.slate, torus(0.2, 0.025, 12, 4), f.at([x, y, z + 2.66], [Math.PI / 2, 0, 0]), 'metal');
    v.add(P.slate, cone(0.13, 0, 6), f.at([x, y, z + 2.92], undefined, [1, 1, 0.22]), 'metal');
    v.add(P.light, ball(0.13, 1), f.at([x, y, z + 2.64]), 'light', { glow: LAMP_GLOW, vary: 0 });
  }

  /** Tambor en estratos: capas apiladas hacia abajo desde `top`, cada una con su radio y su tono. */
  strata(
    f: Frame,
    center: Triple,
    layers: readonly (readonly [number, number, string])[],
    sides = 16,
  ): void {
    let z = center[2];
    for (const [radius, height, tone] of layers) {
      this.pieces.add(
        tone,
        cylinder(radius, sides),
        f.at([center[0], center[1], z - height / 2], undefined, [1, 1, height]),
      );
      z -= height;
    }
  }

  /** Anillo de dovelas: bloques de piedra alrededor de un aro (eje Y del marco). */
  voussoirs(f: Frame, center: Triple, radius: number, count = 28): void {
    const length = ((2 * Math.PI * radius) / count) * 0.93;
    for (let k = 0; k < count; k++) {
      const a = (2 * Math.PI * k) / count;
      const key = k === Math.round(count / 4);
      this.pieces.add(
        key ? P.sandstoneLight : k % 2 ? P.sandstoneLight : P.sandstone,
        box(),
        f.at(
          [center[0] + Math.cos(a) * radius, center[1], center[2] + Math.sin(a) * radius],
          [0, -(a + Math.PI / 2), 0],
          [length, key ? 1.15 : 1, key ? 1.24 : 0.95],
        ),
      );
    }
  }

  /** Rampa de entrada a una plataforma (el personaje es una cápsula: no sube escalones de más de un palmo). */
  ramp(
    f: Frame,
    from: Triple,
    to: readonly [number, number],
    tone: string = P.sandstoneShade,
  ): void {
    // `from` empieza un poco dentro de la plataforma y unos centímetros por encima: así su borde queda debajo
    // de la rampa y no hay labio que frene la cápsula. El pie se apoya en el suelo real (fuera de la explanada
    // el relieve sube o baja) y se hunde bajo él.
    const foot = f.point([to[0], to[1], 0]);
    const ground = this.relief.groundRadius(foot) - foot.length();
    const matrix = f.base.clone().multiply(rampMatrix(from, [to[0], to[1], ground], 2.4));
    this.pieces.add(tone, box(), matrix, 'stone', { solid: true });
  }

  mark(name: string, frame: Frame, at: Triple, props?: Record<string, string | number>): void {
    this.markers.push(props ? { name, frame, at, props } : { name, frame, at });
  }

  /** La Boca: meseta baja con el anillo apagado, su grieta de luz y la placa de inauguración. */
  theMouth(): void {
    const f = this.place(this.site.mouth);
    const v = this.pieces;
    const top = 0.6;
    this.strata(
      f,
      [0, 0, top],
      [
        [8.45, 0.22, P.sandstoneLight],
        [8.6, 0.5, P.sandstone],
        [8.75, 0.12, P.slate],
        [8.9, 0.7, P.sandstoneShade],
        [9.05, 1.6, P.rock],
      ],
      20,
    );
    for (const [radius, tone] of [
      [7.2, P.sandstone],
      [5.6, P.sandstoneLight],
    ] as const) {
      v.add(
        tone,
        cylinder(radius, 20),
        f.at([0, 1.2, top + 0.03], undefined, [1, 1, 0.06]),
        'stone',
        { solid: false },
      );
    }
    // Escalones de estratos bajo el anillo.
    for (const [k, radius] of [4.6, 3.8].entries()) {
      v.add(
        k === 0 ? P.sandstoneShade : P.sandstone,
        cylinder(radius, 18),
        f.at([0, 3.6, top + 0.18 + k * 0.28], undefined, [1, 1, 0.28]),
      );
    }
    const foot = top + 0.6;
    const center = foot + 3.9;
    const ring: Triple = [0, 3.6, center];
    this.voussoirs(f, ring, 3.6);
    v.add(P.slate, torus(3.02, 0.17, 40, 6), f.at(ring), 'metal');
    v.add(P.slate, torus(4.12, 0.09, 40, 5), f.at(ring), 'metal', { solid: false });
    // Marcas de reloj en las dos caras.
    for (const side of [-1, 1]) {
      for (let k = 0; k < 24; k++) {
        const a = (2 * Math.PI * k) / 24;
        const major = k % 6 === 0;
        const length = major ? 0.62 : k % 2 === 0 ? 0.38 : 0.2;
        v.add(
          major ? P.amber : P.slate,
          box(),
          f.at(
            [Math.cos(a) * 3.62, 3.6 + side * 0.53, center + Math.sin(a) * 3.62],
            [0, Math.PI / 2 - a, 0],
            [0.11, 0.08, length],
          ),
          'metal',
        );
      }
    }
    // La cuna que sostiene el anillo y dos bloques de roca.
    v.add(P.sandstoneShade, box(), f.at([0, 3.6, foot + 0.25], undefined, [3.2, 1.6, 0.5]));
    v.add(P.sandstone, box(), f.at([0, 3.6, foot + 0.62], undefined, [2.2, 1.3, 0.3]));
    for (const side of [-1, 1]) {
      v.add(
        P.rock,
        box(),
        f.at([side * 2.55, 3.6, foot + 0.5], [0, side * 0.12, 0], [1.4, 1.7, 1.0]),
      );
      v.add(
        P.slate,
        box(),
        f.at([side * 2.55, 3.6, foot + 1.02], [0, side * 0.12, 0], [1.46, 1.76, 0.06]),
        'metal',
      );
    }
    // Columnas de estratos a los lados, como guardianes.
    for (const side of [-1, 1]) {
      const x = side * 6.2;
      for (let k = 0; k < 5; k++) {
        v.add(
          k % 2 ? P.sandstoneShade : P.sandstone,
          cylinder(0.55 - k * 0.04, 10),
          f.at([x, 4.6, top + 0.3 + k * 0.6], [0, 0, k * 0.2], [1, 1, 0.6]),
        );
      }
      v.add(
        P.slate,
        cylinder(0.6, 10),
        f.at([x, 4.6, top + 3.35], undefined, [1, 1, 0.1]),
        'metal',
      );
      v.add(P.amber, torus(0.36, 0.05, 12, 4), f.at([x, 4.6, top + 3.6]), 'metal');
    }
    // Hilo de luz: la grieta que se cierra a la espalda del viajero.
    let z = center - 2.9;
    for (const [x, length, tilt] of [
      [0.12, 1.5, 0.04],
      [0.2, 0.9, -0.06],
      [0.1, 1.6, 0.05],
      [0.18, 1.8, -0.03],
    ] as const) {
      v.add(
        P.light,
        box(),
        f.at([x, 3.6, z + length / 2], [0, tilt, 0], [0.06, 0.05, length]),
        'light',
        { glow: 7, vary: 0 },
      );
      z += length;
    }
    // El destello del minuto 10: un disco que llena el anillo (EVT_, solo durante boca_destello).
    this.flash.add(
      P.light,
      new CircleGeometry(2.95, 48).rotateX(Math.PI / 2),
      f.at(ring),
      'light',
      { glow: 6, vary: 0 },
    );
    // Placa de inauguración.
    v.add(P.rock, box(), f.at([-3.2, 0.2, top + 0.55], undefined, [0.75, 0.5, 1.1]));
    v.add(
      P.slate,
      box(),
      f.at([-3.2, -0.05, top + 1.2], [-0.5, 0, 0], [0.95, 0.08, 0.62]),
      'metal',
    );
    for (let row = 0; row < 3; row++) {
      v.add(
        row === 0 ? P.amber : P.porcelain,
        box(),
        f.at(
          [-3.2, -0.11 - row * 0.05, top + 1.34 - row * 0.11],
          [-0.5, 0, 0],
          [row === 0 ? 0.7 : 0.55, 0.03, 0.035],
        ),
        'metal',
      );
    }
    // Mojones bajos en el borde de la meseta, con un hueco de entrada hacia el viajero.
    for (let k = 0; k < 10; k++) {
      const a = (2 * Math.PI * k) / 10 + 0.31;
      if (Math.abs(Math.sin(a) + 1) < 0.4) continue;
      const at: Triple = [Math.cos(a) * 7.9, Math.sin(a) * 7.9, top + 0.3];
      v.add(P.sandstoneShade, cylinder(0.22, 8), f.at(at, undefined, [1, 1, 0.6]));
      v.add(
        P.slate,
        cylinder(0.24, 8),
        f.at([at[0], at[1], top + 0.62], undefined, [1, 1, 0.05]),
        'metal',
      );
    }
    for (const x of [-6.5, 6.5]) this.lamp(f, x, -2.5, top);
    this.ramp(f, [0, -8.3, top + 0.06], [0, -10.8]);
    this.mark('SPAWN_LaBoca', f, [0, -4.2, top + 1.0]);
    this.mark('INT_boca', f, [0, 1.6, foot + 1.4], { clue_id: 'umbral.boca', kind: 'observacion' });
    this.mark('INT_placa_inauguracion', f, [-3.2, -0.3, top + 1.25], {
      clue_id: 'umbral.placa',
      kind: 'texto',
    });
    this.mark('TRIG_LaBoca_Destello', f, ring, {
      event: 'boca_destello',
      loop_time: 600,
      duration: 3,
      radius: 12,
    });
  }

  /** El Muelle de Envíos: plataforma, cápsula de envío, cajas, grúa y el atril con el registro. */
  dock(): void {
    const f = this.place(this.site.dock);
    const v = this.pieces;
    const top = 0.5;
    v.add(P.sandstoneShade, box(), f.at([0, 0, top - 1.6], undefined, [11.2, 8.2, 3.2]));
    v.add(P.slate, box(), f.at([0, 0, top - 0.42], undefined, [11.3, 8.3, 0.14]), 'metal');
    v.add(P.sandstone, box(), f.at([0, 0, top - 0.08], undefined, [11.0, 8.0, 0.2]));
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 4; j++) {
        v.add(
          (i + j) % 2 ? P.sandstone : P.sandstoneLight,
          box(),
          f.at([-4.4 + i * 2.2, -3 + j * 2, top + 0.025], undefined, [2.12, 1.92, 0.05]),
          'stone',
          { vary: 0.05 },
        );
      }
    }
    for (const y of [-1.1, -0.1])
      v.add(P.slate, box(), f.at([0, y, top + 0.08], undefined, [10.4, 0.12, 0.08]), 'metal');
    for (const x of [-0.6, 1.6])
      v.add(P.rock, box(), f.at([x, -0.6, top + 0.25], undefined, [0.4, 1.4, 0.35]));
    v.add(
      P.sandstoneLight,
      cylinder(0.82, 14),
      f.at([0.5, -0.6, top + 1.2], [0, Math.PI / 2, 0], [1, 1, 3.0]),
    );
    for (const x of [-0.95, 0.5, 1.95]) {
      v.add(
        P.slate,
        torus(0.84, 0.07, 18, 4),
        f.at([x, -0.6, top + 1.2], [0, 0, Math.PI / 2]),
        'metal',
        { solid: false },
      );
    }
    v.add(
      P.amber,
      cone(0.82, 0.3, 14),
      f.at([2.25, -0.6, top + 1.2], [0, Math.PI / 2, 0], [1, 1, 0.3]),
      'metal',
    );
    v.add(
      P.slate,
      cone(0.82, 0.3, 14),
      f.at([-1.25, -0.6, top + 1.2], [0, -Math.PI / 2, 0], [1, 1, 0.3]),
      'metal',
    );
    const crates: readonly (readonly [number, number, number, number])[] = [
      [2.5, 1.7, 1.2, 0],
      [3.7, 1.8, 1.0, 0],
      [3.0, 1.7, 1.0, 1.15],
      [3.3, 3.0, 1.3, 0],
      [-1.0, 2.9, 1.1, 0],
      [4.1, -2.6, 0.9, 0],
      [-1.0, 2.9, 0.8, 1.1],
    ];
    for (const [x, y, side, above] of crates) {
      const z = top + side / 2 + above;
      const turn = 0.1 * x;
      v.add(
        (x + y) % 2 < 1 ? P.ochre : P.ochreLight,
        box(),
        f.at([x, y, z], [0, 0, turn], [side, side, side]),
      );
      v.add(
        P.slate,
        box(),
        f.at([x, y, z], [0, 0, turn], [side * 1.03, side * 0.18, side * 1.03]),
        'metal',
        { solid: false },
      );
      v.add(
        P.slate,
        box(),
        f.at([x, y, z + side * 0.5], [0, 0, turn], [side * 1.03, side * 1.03, side * 0.06]),
        'metal',
        { solid: false },
      );
    }
    // Grúa: poste, brazo, tirante, contrapeso, cable y gancho.
    v.add(P.rock, cylinder(0.55, 8), f.at([-4.0, 2.6, top + 0.3], undefined, [1, 1, 0.6]));
    v.add(P.slate, cylinder(0.2, 8), f.at([-4.0, 2.6, top + 3.0], undefined, [1, 1, 5.2]), 'metal');
    v.add(P.slate, box(), f.at([-2.6, 2.6, top + 5.5], undefined, [4.6, 0.26, 0.3]), 'metal');
    v.add(P.slate, box(), f.at([-2.4, 2.6, top + 5.0], [0, -0.42, 0], [3.4, 0.12, 0.12]), 'metal');
    v.add(P.rock, box(), f.at([-5.1, 2.6, top + 5.2], undefined, [0.8, 0.6, 0.8]));
    v.add(
      P.porcelain,
      cylinder(0.02, 4),
      f.at([-0.6, 2.6, top + 4.4], undefined, [1, 1, 2.1]),
      'stone',
      { solid: false },
    );
    v.add(P.amber, torus(0.2, 0.045, 10, 4), f.at([-0.6, 2.6, top + 3.2]), 'metal', {
      solid: false,
    });
    // Atril con el registro de envíos.
    v.add(
      P.slate,
      cylinder(0.1, 6),
      f.at([-3.2, -2.8, top + 0.55], undefined, [1, 1, 1.1]),
      'metal',
      { solid: true },
    );
    v.add(
      P.rock,
      box(),
      f.at([-3.2, -2.8, top + 1.12], [-0.4, 0, 0], [0.72, 0.52, 0.06]),
      'stone',
      { solid: false },
    );
    v.add(P.paper, box(), f.at([-3.2, -2.82, top + 1.17], [-0.4, 0, 0], [0.5, 0.36, 0.05]));
    for (const [x, y] of [
      [-5.2, -3.7],
      [5.2, -3.7],
      [5.2, 3.7],
      [-5.2, 3.7],
    ] as const) {
      v.add(P.rock, cylinder(0.2, 8), f.at([x, y, top + 0.35], undefined, [1, 1, 0.7]));
      v.add(
        P.amber,
        torus(0.205, 0.03, 10, 4),
        f.at([x, y, top + 0.55], [Math.PI / 2, 0, 0]),
        'metal',
      );
    }
    for (const x of [-5.0, 5.0]) this.lamp(f, x, -4.6, top - 0.5);
    this.ramp(f, [0, -3.9, top + 0.06], [0, -6.5]);
    this.mark('INT_registro_envios', f, [-3.2, -3.0, top + 1.25], {
      clue_id: 'umbral.envios',
      kind: 'texto',
    });
  }

  /** La caseta del turno: un tambor con ventanilla, los dos relojes y el cuaderno en el mostrador. */
  shiftBooth(): void {
    const f = this.place(this.site.booth);
    const v = this.pieces;
    v.add(P.sandstoneShade, cylinder(1.95, 14), f.at([0, 0, 0.1], undefined, [1, 1, 0.4]));
    v.add(P.sandstone, cylinder(1.7, 14), f.at([0, 0, 1.6], undefined, [1, 1, 2.8]));
    for (const z of [0.9, 1.9, 2.95])
      v.add(P.slate, cylinder(1.74, 14), f.at([0, 0, z], undefined, [1, 1, 0.1]), 'metal');
    v.add(P.ochre, cone(2.15, 0.25, 14), f.at([0, 0, 3.4], undefined, [1, 1, 0.8]));
    v.add(P.ochreLight, cone(2.18, 2.0, 14), f.at([0, 0, 3.02], undefined, [1, 1, 0.08]), 'stone', {
      solid: false,
    });
    v.add(P.slate, cylinder(0.06, 6), f.at([0, 0, 4.0], undefined, [1, 1, 0.5]), 'metal', {
      solid: false,
    });
    v.add(P.amber, torus(0.18, 0.035, 12, 4), f.at([0, 0, 4.3]), 'metal', { solid: false });
    v.add(P.violet, box(), f.at([0, 1.62, 1.55], undefined, [1.3, 0.16, 0.95]), 'stone', {
      solid: false,
    });
    v.add(P.rock, box(), f.at([0, 1.95, 1.0], undefined, [1.6, 0.6, 0.09]), 'stone', {
      solid: true,
    });
    v.add(P.rock, box(), f.at([0, 1.85, 0.5], undefined, [1.4, 0.3, 0.9]));
    v.add(P.paper, box(), f.at([0.15, 2.0, 1.065], [0, 0, 0.2], [0.34, 0.25, 0.04]));
    v.add(P.paper, box(), f.at([-0.25, 2.02, 1.06], [0, 0, -0.1], [0.3, 0.22, 0.02]));
    // Reloj de Umbral y reloj del Archivo, uno junto al otro.
    for (const [x, hand] of [
      [-0.48, 0.4],
      [0.48, 1.5],
    ] as const) {
      v.add(
        P.slate,
        cylinder(0.34, 16),
        f.at([x, 1.66, 2.35], [Math.PI / 2, 0, 0], [1, 1, 0.06]),
        'metal',
        { solid: false },
      );
      v.add(
        P.porcelain,
        cylinder(0.28, 16),
        f.at([x, 1.7, 2.35], [Math.PI / 2, 0, 0], [1, 1, 0.04]),
        'stone',
        { solid: false },
      );
      for (let k = 0; k < 12; k++) {
        const a = (2 * Math.PI * k) / 12;
        v.add(
          k % 3 ? P.slateLight : P.amber,
          box(),
          f.at(
            [x + Math.cos(a) * 0.23, 1.73, 2.35 + Math.sin(a) * 0.23],
            [0, Math.PI / 2 - a, 0],
            [0.02, 0.01, 0.06],
          ),
          'metal',
        );
      }
      v.add(
        P.slate,
        box(),
        f.at(
          [x + 0.1 * Math.sin(hand), 1.74, 2.35 + 0.1 * Math.cos(hand)],
          [0, hand, 0],
          [0.035, 0.02, 0.22],
        ),
        'metal',
      );
    }
    // Banco de espera.
    v.add(
      P.sandstoneShade,
      box(),
      f.at([-2.6, 1.2, 0.42], [0, 0, 0.5], [1.4, 0.45, 0.12]),
      'stone',
      { solid: true },
    );
    for (const dx of [-0.45, 0.45]) {
      v.add(
        P.rock,
        box(),
        f.at(
          [-2.6 + dx * Math.cos(0.5), 1.2 + dx * Math.sin(0.5), 0.2],
          [0, 0, 0.5],
          [0.2, 0.4, 0.4],
        ),
      );
    }
    this.lamp(f, 2.4, 1.2);
    this.mark('INT_cuaderno_turno', f, [0.1, 2.15, 1.2], {
      clue_id: 'umbral.cuaderno',
      kind: 'texto',
    });
  }

  /** El Mirador del Ocaso, frente a la Brasa en el horizonte: banco, dos tazas y la carta. */
  lookout(): void {
    const f = this.place(this.site.lookout);
    const v = this.pieces;
    const top = 0.35;
    this.strata(
      f,
      [0, 0, top],
      [
        [3.6, 0.2, P.sandstone],
        [3.75, 0.1, P.slate],
        [3.85, 0.6, P.sandstoneShade],
        [4.0, 1.6, P.rock],
      ],
      16,
    );
    for (let k = -4; k <= 4; k++) {
      const a = k * 15 * DEG;
      const at: Triple = [Math.sin(a) * 3.35, Math.cos(a) * 3.35, 0];
      v.add(P.sandstone, box(), f.at([at[0], at[1], top + 0.36], [0, 0, -a], [0.86, 0.32, 0.72]));
      v.add(
        P.sandstoneLight,
        box(),
        f.at([at[0], at[1], top + 0.75], [0, 0, -a], [0.9, 0.38, 0.07]),
        'stone',
        { solid: false },
      );
    }
    v.add(
      P.sandstoneLight,
      box(),
      f.at([0, 0.3, top + 0.46], undefined, [2.2, 0.56, 0.12]),
      'stone',
      { solid: true },
    );
    for (const x of [-0.8, 0.8])
      v.add(P.rock, box(), f.at([x, 0.3, top + 0.2], undefined, [0.3, 0.46, 0.4]));
    for (const x of [-0.75, 0.75]) {
      v.add(P.porcelain, cylinder(0.06, 10), f.at([x, 0.38, top + 0.58], undefined, [1, 1, 0.12]));
      v.add(
        P.porcelain,
        torus(0.035, 0.012, 8, 4),
        f.at([x + 0.07, 0.38, top + 0.58], [0, 0, Math.PI / 2]),
      );
    }
    v.add(P.paper, box(), f.at([0.05, 0.25, top + 0.53], [0, 0, 0.3], [0.26, 0.18, 0.015]));
    this.lamp(f, -2.6, -1.6, top);
    this.ramp(f, [0, -3.45, top + 0.06], [0, -5.3]);
    this.mark('INT_carta_mirador', f, [0.05, 0.1, top + 0.7], {
      clue_id: 'umbral.carta',
      kind: 'texto',
    });
  }

  /** El Aula: muros en estratos, bancos y la pared de inscripciones infantiles. */
  classroom(): void {
    const f = this.place(this.site.classroom);
    const v = this.pieces;
    const height = 3.3;
    v.add(P.sandstoneShade, box(), f.at([0, 0.4, -0.15], undefined, [7.6, 6.6, 0.6]));
    v.add(P.sandstone, box(), f.at([0, 0.2, 0.18], undefined, [6.0, 5.0, 0.08]), 'stone', {
      solid: false,
    });
    const layers = [P.sandstone, P.sandstoneShade, P.sandstone, P.sandstoneLight];
    const layer = height / layers.length;
    layers.forEach((tone, k) => {
      const z = 0.2 + layer * (k + 0.5);
      v.add(tone, box(), f.at([0, 2.6, z], undefined, [6.4, 0.42, layer]));
      for (const side of [-1, 1])
        v.add(tone, box(), f.at([side * 3.0, 0.2, z], undefined, [0.42, 5.2, layer]));
    });
    v.add(P.rockLight, box(), f.at([0, 0.4, height + 0.25], undefined, [7.1, 6.1, 0.1]), 'stone', {
      solid: false,
    });
    v.add(P.ochre, box(), f.at([0, 0.4, height + 0.42], undefined, [6.9, 5.9, 0.26]));
    v.add(
      P.amber,
      torusArc(1.1, 0.07, 0, Math.PI, 16, 4),
      f.at([0, -2.55, height + 0.55]),
      'metal',
      { solid: false },
    );
    for (let row = 0; row < 3; row++) {
      const y = -1.4 + row * 1.05;
      v.add(P.rockLight, box(), f.at([0, y, 0.55], undefined, [3.8, 0.34, 0.08]), 'stone', {
        solid: true,
      });
      for (const x of [-1.6, 0, 1.6])
        v.add(P.rock, box(), f.at([x, y, 0.37], undefined, [0.12, 0.3, 0.3]), 'stone', {
          solid: false,
        });
    }
    v.add(P.sandstoneLight, box(), f.at([1.8, 1.7, 0.6], [0, 0, 0.2], [0.8, 0.5, 0.8]));
    v.add(P.slate, box(), f.at([0, 2.37, 1.75], undefined, [4.0, 0.04, 1.4]), 'metal');
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 11; k++) {
        const length = (k + row) % 3 === 0 ? 0.26 : 0.14;
        v.add(
          k % 4 === 0 ? P.amber : P.porcelain,
          box(),
          f.at(
            [-1.7 + k * 0.34, 2.34, 2.25 - row * 0.32],
            [0, 0.4 * (k % 2), 0],
            [0.045, 0.02, length],
          ),
          'metal',
          { vary: 0 },
        );
      }
    }
    for (let k = 0; k < 12; k++) {
      const a = (2 * Math.PI * k) / 12;
      v.add(
        P.porcelain,
        box(),
        f.at(
          [2.4 + Math.cos(a) * 0.35, 2.34, 2.0 + Math.sin(a) * 0.35],
          [0, Math.PI / 2 - a, 0],
          [0.03, 0.02, 0.1],
        ),
        'metal',
      );
    }
    this.lamp(f, -3.9, -2.8, 0.15);
    this.mark('INT_aula', f, [0.2, 1.7, 1.5], { clue_id: 'umbral.aula', kind: 'texto' });
  }

  house(f: Frame, notice: boolean): void {
    const v = this.pieces;
    v.add(P.sandstoneShade, cylinder(2.35, 12), f.at([0, 0, 0.1], undefined, [1, 1, 0.5]));
    v.add(P.sandstone, cylinder(2.2, 12), f.at([0, 0, 1.5], undefined, [1, 1, 2.6]));
    v.add(P.slate, cylinder(2.24, 12), f.at([0, 0, 2.0], undefined, [1, 1, 0.1]), 'metal', {
      solid: false,
    });
    v.add(P.sandstoneLight, cylinder(2.28, 12), f.at([0, 0, 2.8], undefined, [1, 1, 0.12]));
    v.add(P.ochre, cone(2.75, 0.2, 12), f.at([0, 0, 3.45], undefined, [1, 1, 1.2]));
    v.add(P.slate, torus(0.22, 0.04, 10, 4), f.at([0, 0, 4.1], [Math.PI / 2, 0, 0]), 'metal', {
      solid: false,
    });
    v.add(P.violet, box(), f.at([0, 2.17, 1.15], undefined, [0.95, 0.12, 1.9]), 'stone', {
      solid: false,
    });
    v.add(
      P.sandstoneShade,
      torusArc(0.58, 0.09, 0, Math.PI, 12, 4),
      f.at([0, 2.22, 2.0]),
      'stone',
      { solid: false },
    );
    for (const a of [-0.9, 0.9]) {
      v.add(
        P.slate,
        box(),
        f.at([Math.sin(a) * 2.18, Math.cos(a) * 2.18, 1.6], [0, 0, -a], [0.18, 0.1, 0.8]),
        'metal',
        { solid: false },
      );
    }
    if (notice) v.add(P.paper, box(), f.at([0.22, 2.25, 1.35], undefined, [0.32, 0.02, 0.42]));
    // La mesa servida delante de la puerta.
    v.add(P.rock, box(), f.at([0, 3.3, 0.72], undefined, [1.4, 0.8, 0.08]), 'stone', {
      solid: true,
    });
    for (const x of [-0.5, 0.5])
      v.add(P.rock, box(), f.at([x, 3.3, 0.36], undefined, [0.1, 0.6, 0.7]), 'stone', {
        solid: false,
      });
    v.add(P.cloth, box(), f.at([0, 3.3, 0.77], undefined, [1.2, 0.34, 0.012]));
    for (const x of [-0.45, 0, 0.45]) {
      v.add(P.porcelain, cylinder(0.14, 10), f.at([x, 3.1, 0.785], undefined, [1, 1, 0.02]));
      v.add(P.porcelain, cylinder(0.045, 8), f.at([x + 0.12, 3.5, 0.82], undefined, [1, 1, 0.09]));
    }
    v.add(P.bread, ball(0.1, 1), f.at([-0.45, 3.1, 0.84], undefined, [1.3, 1, 0.6]));
    for (const [dx, dy] of [
      [0, 0],
      [0.08, 0.05],
      [-0.05, 0.07],
    ] as const) {
      v.add(P.fruit, ball(0.055, 1), f.at([0.45 + dx, 3.1 + dy, 0.84]));
    }
    for (const x of [-0.75, 0.75])
      v.add(P.sandstoneShade, cylinder(0.18, 8), f.at([x, 3.9, 0.22], undefined, [1, 1, 0.44]));
  }

  /** Las seis Casas en corro alrededor de una plaza con un reloj de sol de anillo. */
  houses(): void {
    const plazaSite = this.site.plaza;
    const plaza = this.place(plazaSite);
    const v = this.pieces;
    v.add(
      P.sandstoneLight,
      cylinder(3.2, 20),
      plaza.at([0, 0, 0.03], undefined, [1, 1, 0.12]),
      'stone',
      { solid: false },
    );
    v.add(P.slate, torus(3.2, 0.06, 32, 4), plaza.at([0, 0, 0.08], [Math.PI / 2, 0, 0]), 'metal', {
      solid: false,
    });
    v.add(P.rock, cylinder(0.35, 8), plaza.at([0, 0, 0.85], undefined, [1, 1, 1.6]));
    v.add(P.slate, torus(0.62, 0.06, 20, 4), plaza.at([0, 0, 1.95], [0, 0, 0.3]), 'metal', {
      solid: false,
    });
    v.add(
      P.slate,
      torus(0.62, 0.05, 20, 4),
      plaza.at([0, 0, 1.95], [Math.PI / 2, 0, 0.3]),
      'metal',
      { solid: false },
    );
    v.add(P.amber, box(), plaza.at([0, 0, 1.95], [0, 0.6, 0], [0.04, 0.04, 1.2]), 'metal', {
      solid: false,
    });
    for (let k = 0; k < 12; k++) {
      const a = (2 * Math.PI * k) / 12;
      v.add(
        k % 3 ? P.sandstoneShade : P.amber,
        box(),
        plaza.at([Math.cos(a) * 2.7, Math.sin(a) * 2.7, 0.1], [0, 0, a], [0.35, 0.08, 0.04]),
      );
    }
    const target = direction(plazaSite.lat, plazaSite.lon);
    houseSpots(plazaSite).forEach(({ lat, lon }, k) => {
      const f = this.place({
        lat,
        lon,
        heading: headingTowards(lat, lon, target),
        footprint: 2.4,
        sink: 0.3,
      });
      this.house(f, k === 0);
      if (k === 0)
        this.mark('INT_casas', f, [0.2, 2.6, 1.35], { clue_id: 'umbral.casas', kind: 'objeto' });
      if (k % 2 === 0) this.lamp(f, 2.3, 2.6);
    });
  }

  /** Una mesa de estratos: capas de contorno irregular, cada una algo más pequeña y desplazada. */
  mesa(
    lat: number,
    lon: number,
    radius: number,
    layers: number,
    height: number,
    seed: number,
  ): void {
    const f = this.place({ lat, lon, heading: seed * 37 });
    const random = seededRandom(seed);
    const sides = 26;
    let z = -9; // la primera capa nace bajo tierra: la curvatura del planeta no la deja flotar
    let cx = 0;
    let cy = 0;
    for (let k = 0; k < layers; k++) {
      const z1 = k === 0 ? height / layers : z + (height / layers) * (0.75 + random() * 0.5);
      const r0 = radius * (1 - Math.pow(k / layers, 1.15) * 0.78);
      cx += (random() - 0.5) * radius * 0.12;
      cy += (random() - 0.5) * radius * 0.12;
      const ring: (readonly [number, number])[] = [];
      for (let i = 0; i < sides; i++) {
        const a = (2 * Math.PI * i) / sides;
        const r =
          r0 *
          (1 +
            0.17 * noise(Math.cos(a) * 1.4 + k * 0.6, Math.sin(a) * 1.4, seed + k * 1.9) +
            0.05 * noise(Math.cos(a) * 5, Math.sin(a) * 5, k + seed));
        ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      const tone = STRATA[(k + seed) % STRATA.length] ?? P.rock;
      const middle = z + (z1 - z) * (k === 0 ? 0.9 : 0.14);
      this.wall(f, ring, z, middle, k === 0 ? tone : new Color(tone).multiplyScalar(0.8));
      this.wall(f, ring, middle, z1, tone);
      const cap: number[] = [];
      ring.forEach(([ax, ay], i) => {
        const [bx, by] = ring[(i + 1) % ring.length] ?? [ax, ay];
        cap.push(cx, cy, z1, ax, ay, z1, bx, by, z1);
      });
      this.pieces.add(
        k === layers - 1 ? P.sandstone : '#CDB08A',
        geometryFrom(cap),
        f.base,
        'stone',
        { vary: 0.03 },
      );
      z = z1;
    }
    this.relief.footprints.push({ d: direction(lat, lon), radius: radius * 0.92 });
  }

  private wall(
    f: Frame,
    ring: readonly (readonly [number, number])[],
    z0: number,
    z1: number,
    tone: string | Color,
  ): void {
    const positions: number[] = [];
    ring.forEach(([ax, ay], i) => {
      const [bx, by] = ring[(i + 1) % ring.length] ?? [ax, ay];
      positions.push(ax, ay, z0, bx, by, z0, bx, by, z1, ax, ay, z0, bx, by, z1, ax, ay, z1);
    });
    this.pieces.add(tone, geometryFrom(positions), f.base, 'stone', { vary: 0.04, solid: true });
  }

  /** El macizo y los oteros: mesas pequeñas por la planicie, lejos de los lugares y de los caminos. */
  mesas(): void {
    this.mesa(MASSIF.lat, MASSIF.lon, MASSIF.radius, 8, 21, 3);
    const random = seededRandom(57);
    let placed = 0;
    for (let attempt = 0; attempt < 400 && placed < 9; attempt++) {
      const lat = (random() * 2 - 1) * 58;
      const lon = random() * 360 - 180;
      const d = direction(lat, lon);
      const radius = 2.5 + random() * 4.5;
      const crowded =
        this.relief.pads.some(
          (p) => angleBetween(d, p.d) * UMBRAL_RADIUS < p.radius + p.falloff + radius + 4,
        ) ||
        this.relief.footprints.some(
          (p) => angleBetween(d, p.d) * UMBRAL_RADIUS < p.radius + radius + 10,
        ) ||
        this.relief.paths.some((p) => this.relief.pathDistance(d, p) < radius + 3);
      if (crowded) continue;
      this.mesa(
        lat,
        lon,
        radius,
        2 + Math.floor(random() * 3),
        radius * (0.6 + random() * 0.5),
        10 + placed,
      );
      placed++;
    }
  }

  /** Mojones a lo largo de los caminos. */
  cairns(): void {
    const random = seededRandom(19);
    for (const path of this.relief.paths) {
      const steps = Math.floor((path.length * UMBRAL_RADIUS) / 11);
      for (let i = 1; i < steps; i++) {
        const d = path.a
          .clone()
          .lerp(path.b, i / steps)
          .normalize();
        const p = d.addScaledVector(path.normal, (i % 2 ? 1.7 : -1.7) / UMBRAL_RADIUS).normalize();
        if (!this.relief.isFree(p, 1.5)) continue;
        const { lat, lon } = latLon(p);
        const f = this.place({ lat, lon, heading: random() * 360, sink: 0.08 });
        let z = 0;
        const count = 2 + Math.floor(random() * 2);
        for (let k = 0; k < count; k++) {
          const s = 0.42 - k * 0.09;
          this.pieces.add(
            k % 2 ? P.sandstoneShade : P.rock,
            box(),
            f.at([0, 0, z + s * 0.3], [0, 0, random()], [s, s * 0.85, s * 0.6]),
            'stone',
            { vary: 0.08, solid: k === 0 },
          );
          z += s * 0.6;
        }
        this.pieces.add(
          P.amber,
          box(),
          f.at([0, 0, z + 0.03], undefined, [0.12, 0.04, 0.06]),
          'metal',
        );
      }
    }
  }
}

// ---- Detalle disperso -------------------------------------------------------------------------------------

function rockGeometry(): BufferGeometry {
  const geometry = new DodecahedronGeometry(1, 0);
  const position = geometry.getAttribute('position');
  const random = seededRandom(23);
  const v = new Vector3();
  const offsets = new Map<string, number>();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let offset = offsets.get(key);
    if (offset === undefined) {
      offset = 0.75 + random() * 0.5;
      offsets.set(key, offset);
    }
    v.multiplyScalar(offset);
    position.setXYZ(i, v.x, v.y, v.z * 0.6);
  }
  geometry.deleteAttribute('uv');
  geometry.computeVertexNormals();
  return geometry;
}

function tuftGeometry(): BufferGeometry {
  const random = seededRandom(29);
  const blades = Array.from({ length: 5 }, () => {
    const length = 0.3 + random() * 0.28;
    const blade = new CylinderGeometry(0, 0.035, length, 3, 1, true)
      .rotateX(Math.PI / 2)
      .translate(0, 0, length / 2)
      .rotateY((random() - 0.5) * 0.9)
      .rotateX((random() - 0.5) * 0.9)
      .rotateZ(random() * Math.PI * 2);
    blade.deleteAttribute('uv');
    return blade.toNonIndexed();
  });
  return mergeGeometries(blades);
}

function shardGeometry(): BufferGeometry {
  const geometry = new OctahedronGeometry(1, 0);
  geometry.deleteAttribute('uv');
  return geometry.scale(0.4, 0.4, 0.9).translate(0, 0, 0.5);
}

// ---- Ensamblado -------------------------------------------------------------------------------------------

export interface UmbralOptions {
  /** Subdivisión del terreno (menos en equipos modestos). La colisión usa la misma malla. */
  detail?: number;
}

export interface UmbralStats {
  terrain: number;
  places: number;
  detail: number;
  colliders: number;
}

/**
 * Construye Umbral con la misma forma que tenía el .glb exportado: una escena con la raíz `umbral` (radio,
 * gravedad, reloj y luz ambiente en userData), sus mallas y sus marcas. Todo en el marco del propio mundo.
 */
export function buildUmbral({ detail = UMBRAL_DETAIL }: UmbralOptions = {}): Group {
  const sun = sunInUmbral();
  const relief = new Relief();
  const builder = new UmbralBuilder(relief, sun);
  const s = builder.site;
  relief.addPad(s.mouth.lat, s.mouth.lon, 10.2);
  relief.addPad(s.dock.lat, s.dock.lon, 7.6);
  relief.addPad(s.booth.lat, s.booth.lon, 3.4, 4);
  relief.addPad(s.lookout.lat, s.lookout.lon, 4.6, 3.5);
  relief.addPad(s.classroom.lat, s.classroom.lon, 5.6);
  relief.addPad(s.plaza.lat, s.plaza.lon, 13, 6);
  relief.addPad(SHIP_PARK.lat, SHIP_PARK.lon, 4, 3);
  const route: readonly (readonly [keyof typeof s, keyof typeof s])[] = [
    ['mouth', 'dock'],
    ['mouth', 'lookout'],
    ['dock', 'booth'],
    ['mouth', 'booth'],
    ['booth', 'classroom'],
    ['classroom', 'plaza'],
  ];
  for (const [from, to] of route) {
    relief.addPath(direction(s[from].lat, s[from].lon), direction(s[to].lat, s[to].lon));
  }

  builder.theMouth();
  builder.dock();
  builder.shiftBooth();
  builder.lookout();
  builder.classroom();
  builder.houses();
  builder.mesas();
  builder.cairns();

  const sky = {
    day: new Color('#b89ab8').multiplyScalar(1.7),
    ground: new Color('#c48a58').multiplyScalar(1.3),
    night: new Color(0.07, 0.06, 0.16),
  };
  const lit = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, sky);
    return material;
  };
  const materials = {
    ground: lit({ vertexColors: true, roughness: 0.95 }),
    stone: lit({ vertexColors: true, roughness: 0.88 }),
    metal: lit({ vertexColors: true, roughness: 0.5, metalness: 0.45 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
    rock: lit({ roughness: 0.92 }),
    tuft: lit({ roughness: 1, side: DoubleSide }),
    ice: lit({ roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.92 }),
  };

  // Marco de Blender: el contenido se gira −90° en X (como el exportador glTF).
  const frame = new Group();
  frame.name = 'umbral_Marco';
  frame.rotation.x = -Math.PI / 2;

  const terrainGeometry = sphereTerrain({
    radius: UMBRAL_RADIUS,
    detail,
    height: (x, y, z) => relief.height(x, y, z),
    faceColor: (x, y, z, h, slope, random) => groundColor(relief, x, y, z, h, slope, random),
  });
  const terrain = new Mesh(terrainGeometry, materials.ground);
  terrain.name = 'umbral_Terreno';
  terrain.castShadow = true;
  terrain.receiveShadow = true;
  frame.add(terrain);
  // La colisión del suelo es la misma malla que se ve (si no, el jugador se hunde o flota).
  const groundCollider = new Mesh(terrainGeometry);
  groundCollider.name = 'COL_umbral_Terreno';
  groundCollider.visible = false;
  frame.add(groundCollider);

  for (const mesh of piecesToMeshes(builder.pieces, materials, 'umbral')) frame.add(mesh);

  const random = seededRandom(41);
  const groundRadius = (d: XYZ): number => relief.groundRadius(d);
  const rocks = scatter(
    {
      name: 'umbral_Rocas',
      geometry: rockGeometry(),
      material: materials.rock,
      count: 420,
      castShadow: true,
      groundRadius,
      solidAbove: 0.6,
      pick: (d, r) => {
        const talus = massifSlope(d.x, d.y, d.z);
        if (
          iceCap(d.z, d.x, d.y) > 0.6 ||
          !relief.isFree(d, 1.5) ||
          relief.onPath(d.x, d.y, d.z) > 0.2
        )
          return null;
        if (r() > 0.3 + talus * 2) return null;
        const big = r() < 0.06 + talus * 0.35;
        const size = big ? 0.9 + r() * 1.6 : 0.12 + r() * 0.4;
        return {
          scale: [size * (0.8 + r() * 0.5), size * (0.8 + r() * 0.5), size],
          sink: size * 0.25,
          color: [P.rock, P.rockLight, P.rockDark, P.sandstoneShade][Math.floor(r() * 4)] ?? P.rock,
        };
      },
    },
    random,
  );
  const tufts = scatter(
    {
      name: 'umbral_Matas',
      geometry: tuftGeometry(),
      material: materials.tuft,
      count: 2200,
      castShadow: false,
      groundRadius,
      pick: (d, r) => {
        if (iceCap(d.z, d.x, d.y) > 0.05 || massifSlope(d.x, d.y, d.z) > 0.6) return null;
        if (!relief.isFree(d, 0.5) || relief.onPath(d.x, d.y, d.z) > 0.1) return null;
        if (fbm(noise, d.x * 2.4 + 3, d.y * 2.4, d.z * 2.4, 2) < -0.1) return null; // crecen en manchas
        const size = 0.7 + r() * 0.8;
        return {
          scale: [size, size, size * (0.8 + r() * 0.5)],
          sink: 0.02,
          color: r() < 0.5 ? P.tuft : P.tuftDry,
        };
      },
    },
    random,
  );
  const shards = scatter(
    {
      name: 'umbral_Hielo',
      geometry: shardGeometry(),
      material: materials.ice,
      count: 180,
      castShadow: true,
      groundRadius,
      pick: (d, r) => {
        if (iceCap(d.z, d.x, d.y) < 0.7) return null;
        const size = 0.3 + r() * 0.8;
        return {
          scale: [size, size, size],
          sink: 0.25,
          tilt: 0.5,
          color: r() < 0.5 ? P.ice : P.iceLight,
        };
      },
    },
    random,
  );
  frame.add(rocks.mesh, tufts.mesh, shards.mesh);
  for (const g of rocks.colliders) builder.pieces.addCollider(g);
  frame.add(colliderMesh('COL_umbral_Lugares', builder.pieces.colliders));

  // El destello de La Boca: EVT_, el juego lo enseña solo mientras dura su evento.
  const flash = new Mesh(
    mergeGeometries(builder.flash.parts.light),
    new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  flash.name = 'EVT_LaBoca_Destello';
  flash.userData.event = 'boca_destello';
  frame.add(flash);

  for (const { name, frame: f, at, props } of builder.markers) {
    frame.add(marker(name, f.point(at), f.rotation(), props));
  }
  const parkUp = direction(SHIP_PARK.lat, SHIP_PARK.lon);
  frame.add(
    marker(
      'PARK_Nave',
      parkUp.clone().multiplyScalar(relief.groundRadius(parkUp)),
      uprightRotation(parkUp),
    ),
  );

  const root = new Object3D();
  root.name = UMBRAL_ID;
  Object.assign(root.userData, {
    world_id: UMBRAL_ID,
    radius: UMBRAL_RADIUS,
    gravity: 1,
    clock_rate: 1,
    // La luz de cielo de los materiales hace de relleno: la ambiente general se queda en un toque.
    ambient: 0.35,
    ambient_color: '#7a6a8c',
  });
  const stats: UmbralStats = {
    terrain: triangleCount(terrainGeometry),
    places: 0,
    detail: 0,
    colliders: 0,
  };
  frame.traverse((object) => {
    if (!isMesh(object) || object.name.startsWith('COL_')) return;
    const count =
      triangleCount(object.geometry) * (object instanceof InstancedMesh ? object.count : 1);
    if (
      object.name.startsWith('umbral_Lugares') ||
      object.name.startsWith('umbral_Metal') ||
      object.name.startsWith('umbral_Luces')
    )
      stats.places += count;
    else if (object !== terrain && !object.name.startsWith('EVT_')) stats.detail += count;
  });
  stats.colliders = builder.pieces.colliders.reduce((sum, g) => sum + triangleCount(g), 0);
  root.userData.stats = stats;
  root.add(frame);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
