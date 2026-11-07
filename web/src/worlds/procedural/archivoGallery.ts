// La Galería del Archivo (Fase 11E): el tubo de vidrio que da la vuelta al planeta al nivel del agua (✅ Anthony,
// 2026-11-03), con los archivos dentro, en seco; la esclusa del fondo, su única entrada (🟡 la forma); y las seis
// torres que lo sostienen. Gramática del Archivo: piedra perla, marfil, acero azul y oro apagado.
import { BufferGeometry, Matrix4, Vector3 } from 'three';
import {
  ARCHIVO_ID,
  FLOOR_RADIUS,
  floorHalfLat,
  floorRadius,
  FONDO,
  insideTube,
  LOCK,
  lonDelta,
  SEABED,
  TOWER_LAT,
  TOWER_LONS,
  TUBE_MAJOR,
  TUBE_MINOR,
} from './archivoShape';
import {
  ball,
  box,
  cone,
  cylinder,
  direction,
  frameAt,
  geometryFrom,
  latLon,
  PieceSet,
  rampMatrix,
  torus,
  torusArc,
  type Frame,
  type MarkerProps,
  type Surface,
  type Triple,
} from './kit';
import { seededRandom } from './noise';
import { RoomsBuilder } from './archivoRooms';
import { buildArchivoPuzzles } from './archivoPuzzles';
import { buildArchivoDepths } from './archivoDepths';
import { CELL_AT, CELL_CLEAR } from './archivoDepthsShape';
import { inCorridor, nearBulkhead, roomAt } from './archivoRoomsShape';

const DEG = Math.PI / 180;

export const ARCHIVO_PALETTE = {
  pearl: '#C9CED3',
  pearlLight: '#DCDFE2',
  pearlShade: '#A9B0B8',
  ivory: '#E8E0CC',
  ivoryShade: '#CFC6B0',
  steel: '#56677A',
  steelDark: '#3D4A5A',
  gold: '#B8973F',
  goldLight: '#D4B565',
  ink: '#2A3038',
  paper: '#EDE6D2',
  rock: '#4A5560',
  rockLight: '#5E6B76',
  rockDark: '#36404A',
  sand: '#8C8F84',
  sandLight: '#A6A694',
  light: '#FFE2A0',
  lightCold: '#CFE8FF',
} as const;
const P = ARCHIVO_PALETTE;
/** Brillo de las luces (no dependen de la Brasa). */
const GLOW = 3;

/** Las siete fuentes de siempre, en su sitio (blender/marcas/archivo.json): latitud, longitud y altura. */
export const ARCHIVO_SOURCES = [
  { id: 'informe_oficial', lat: 0, lon: -11.392, alto: 1.33, kind: 'texto' },
  { id: 'indice', lat: 4.147, lon: 20, alto: 2.723, kind: 'texto' },
  { id: 'sala_relojes', lat: -2.452, lon: -32, alto: 1.56, kind: 'observacion' },
  { id: 'cartas', lat: -3.988, lon: 44, alto: 1.131, kind: 'texto' },
  { id: 'escritorio', lat: -3.895, lon: 38, alto: 1.21, kind: 'texto' },
  { id: 'ranura_luz', lat: 0, lon: 99.526, alto: 1.25, kind: 'texto' },
  { id: 'fondo_canon', lat: 0, lon: -100.957, alto: 1.178, kind: 'texto' },
] as const;
export type ArchivoSourceId = (typeof ARCHIVO_SOURCES)[number]['id'];

/** El hueco del suelo de la Galería por donde sube la rampa de la esclusa (longitudes y medio ancho en grados). */
export const LOCK_HOLE = { from: 82, to: 88, halfLat: 1.1 } as const;

export interface MarkerSpec {
  name: string;
  frame: Frame;
  at: Triple;
  props: MarkerProps;
}

/** El suelo de la Galería como superficie donde colocar cosas (baja en el Fondo). */
export const galleryFloor: Surface = {
  radius: FLOOR_RADIUS,
  groundRadius: (d) => floorRadius(latLon(d).lon),
};

/** Una superficie esférica de radio fijo (para colocar la esclusa en el fondo, ya allanado). */
const sphereAt = (radius: number): Surface => ({ radius, groundRadius: () => radius });

/** Un punto del tubo: `u` la longitud y `v` el ángulo alrededor de su sección (0 hacia fuera del planeta, 90° al
 * norte, 180° hacia el centro: la mitad con `v` entre 90° y 270° queda bajo el agua). */
function tubePoint(u: number, v: number, radius = TUBE_MINOR): Vector3 {
  const ring = TUBE_MAJOR + radius * Math.cos(v * DEG);
  return new Vector3(
    ring * Math.cos(u * DEG),
    ring * Math.sin(u * DEG),
    radius * Math.sin(v * DEG),
  );
}

/** Marco de la sección del tubo en una longitud: X hacia fuera, Y hacia el este, Z hacia el norte. */
export function tubeSection(lon: number): Matrix4 {
  const out = new Vector3(Math.cos(lon * DEG), Math.sin(lon * DEG), 0);
  const east = new Vector3(-out.y, out.x, 0);
  return new Matrix4()
    .makeBasis(out, east, new Vector3(0, 0, 1))
    .setPosition(out.clone().multiplyScalar(TUBE_MAJOR));
}

/** Caja que va de `a` a `b` (su eje Y), con su Z lo más hacia fuera del planeta posible. */
export function beam(a: Vector3, b: Vector3, width: number, height: number): Matrix4 {
  const along = b.clone().sub(a);
  const length = along.length();
  along.divideScalar(length);
  const middle = a.clone().add(b).multiplyScalar(0.5);
  const up = middle.clone().normalize();
  up.addScaledVector(along, -up.dot(along));
  if (up.lengthSq() < 1e-8) up.set(0, 0, 1).addScaledVector(along, -along.z);
  up.normalize();
  const side = along.clone().cross(up).normalize();
  return new Matrix4()
    .makeBasis(side, along, up)
    .setPosition(middle)
    .multiply(new Matrix4().makeScale(width, length, height));
}

export interface GlassTube {
  /** La mitad de arriba (fuera del agua), clara, y la de abajo (dentro del agua), azul. */
  upper: BufferGeometry;
  lower: BufferGeometry;
  /** Todo el vidrio, cerrado salvo el hueco del pozo de la esclusa: no se atraviesa. */
  collider: BufferGeometry;
}

const TUBE_STEP_U = 1;
const TUBE_STEP_V = 15;
/** Celdas del vidrio que se quitan sobre el pozo (dentro de sus paredes: el pozo cierra el hueco). */
const HOLE_U = 2.3;
const HOLE_V = 15;

export function glassTube(): GlassTube {
  const upper: number[] = [];
  const lower: number[] = [];
  for (let u = -180; u < 180; u += TUBE_STEP_U) {
    for (let v = -90; v < 270; v += TUBE_STEP_V) {
      const cu = u + TUBE_STEP_U / 2;
      const cv = v + TUBE_STEP_V / 2;
      if (Math.abs(lonDelta(cu, LOCK.lon)) < HOLE_U && Math.abs(cv - 180) < HOLE_V) continue;
      const a = tubePoint(u, v);
      const b = tubePoint(u + TUBE_STEP_U, v);
      const c = tubePoint(u + TUBE_STEP_U, v + TUBE_STEP_V);
      const d = tubePoint(u, v + TUBE_STEP_V);
      const target = v >= 90 ? lower : upper;
      target.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      target.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  }
  const collider = geometryFrom([...upper, ...lower]);
  return { upper: geometryFrom(upper), lower: geometryFrom(lower), collider };
}

/** Latitudes de una columna del suelo: tres franjas por lado y el centro partido donde va el hueco. */
function floorLats(half: number): number[] {
  const inner = LOCK_HOLE.halfLat;
  const side = [inner, inner + (half - inner) / 3, inner + (2 * (half - inner)) / 3, half];
  return [...side.map((l) => -l).reverse(), 0, ...side];
}

const FLOOR_THICKNESS = 0.4;
const FLOOR_STEP = 1;

/** El suelo de la Galería: una franja esférica bajo el vidrio, con el Fondo hundido y el hueco de la esclusa. */
export function floorGeometry(): BufferGeometry {
  const positions: number[] = [];
  const push = (...points: Vector3[]) => {
    for (const p of points) positions.push(p.x, p.y, p.z);
  };
  const column = (lon: number, drop: number) => {
    const r = floorRadius(lon);
    return floorLats(floorHalfLat(r)).map((lat) => direction(lat, lon).multiplyScalar(r - drop));
  };
  for (let lon = -180; lon < 180; lon += FLOOR_STEP) {
    const top0 = column(lon, 0);
    const top1 = column(lon + FLOOR_STEP, 0);
    const low0 = column(lon, FLOOR_THICKNESS);
    const low1 = column(lon + FLOOR_STEP, FLOOR_THICKNESS);
    const middle = lon + FLOOR_STEP / 2;
    const inHole = middle > LOCK_HOLE.from && middle < LOCK_HOLE.to;
    for (let j = 0; j < top0.length - 1; j++) {
      // Las dos franjas del centro (j = 3 y 4) se quitan en el hueco de la rampa.
      if (inHole && (j === 3 || j === 4)) continue;
      const [a, b, c, d] = [top0[j], top1[j], top1[j + 1], top0[j + 1]] as Vector3[];
      const [e, f, g, h] = [low0[j], low1[j], low1[j + 1], low0[j + 1]] as Vector3[];
      if (!a || !b || !c || !d || !e || !f || !g || !h) continue;
      push(a, b, c, a, c, d); // arriba, mirando hacia fuera del planeta
      push(e, g, f, e, h, g); // abajo, hacia el centro
    }
  }
  return geometryFrom(positions);
}

/** Dónde entra el rayo de la Brasa por el vidrio para caer sobre la tablilla de la ranura (el prisma). */
export function prismPoint(tablet: Vector3, sun: Vector3): Vector3 {
  const p = new Vector3();
  for (let t = 0; t < 30; t += 0.05) {
    p.copy(tablet).addScaledVector(sun, t);
    if (!insideTube(p.x, p.y, p.z)) return p;
  }
  return p;
}

export class GalleryBuilder {
  readonly pieces = new PieceSet(13);
  /** El rayo de la ranura (EVT_: solo se ve mientras dura su evento). */
  readonly beam = new PieceSet(17);
  readonly markers: MarkerSpec[] = [];
  private readonly random = seededRandom(23);

  constructor(
    private readonly seabed: Surface,
    private readonly sun: Vector3,
  ) {}

  build(): void {
    this.floor();
    this.ribs();
    this.arches();
    this.shelves();
    this.lamps();
    this.rooms();
    this.puzzles();
    this.places();
    this.lock();
    for (const [index, lon] of TOWER_LONS.entries()) this.tower(index + 1, lon);
  }

  private at(lat: number, lon: number, heading = 0): Frame {
    return frameAt(galleryFloor, lat, lon, { heading });
  }

  /** Distancia por el suelo (m) de un punto a la fuente más cercana. */
  private nearestSource(lat: number, lon: number): number {
    const here = direction(lat, lon);
    return Math.min(
      ...ARCHIVO_SOURCES.map((s) => here.angleTo(direction(s.lat, s.lon)) * FLOOR_RADIUS),
    );
  }

  private floor(): void {
    this.pieces.add(P.pearl, floorGeometry(), new Matrix4(), 'stone', { vary: 0 });
    // Un camino de marfil por el centro (fino: se pisa el suelo de debajo).
    for (let lon = -180; lon < 180; lon += 4) {
      if (lon + 4 > LOCK_HOLE.from - 1 && lon < LOCK_HOLE.to + 1) continue;
      if (Math.abs(lonDelta(lon + 2, FONDO.lon)) < FONDO.flat + FONDO.ramp + 2) continue;
      const f = this.at(0, lon + 2, 90);
      this.pieces.add(
        roomAt(lon + 2).path,
        box(),
        f.at([0, 0, 0.01], undefined, [1.2, 4.4, 0.03]),
        'stone',
        { solid: false, vary: 0.02 },
      );
    }
  }

  /** Costillas de acero alrededor del vidrio, cada 10° (no la del pozo). */
  private ribs(): void {
    for (let lon = -180; lon < 180; lon += 10) {
      if (Math.abs(lonDelta(lon, LOCK.lon)) < 4) continue;
      this.pieces.add(P.steel, torus(TUBE_MINOR + 0.06, 0.12, 40, 4), tubeSection(lon), 'metal', {
        solid: false,
      });
    }
  }

  /** Arcos de piedra dentro del tubo, cada 20°: van del suelo al techo por encima de las estanterías. */
  private arches(): void {
    for (let lon = -170; lon < 180; lon += 20) {
      if (Math.abs(lonDelta(lon, FONDO.lon)) < 10) continue;
      this.pieces.add(
        P.pearlShade,
        torusArc(TUBE_MINOR - 0.55, 0.22, -128 * DEG, 128 * DEG, 24, 5),
        tubeSection(lon),
        'stone',
        { solid: false },
      );
    }
  }

  private shelves(): void {
    const step = 2.2;
    for (let lon = -180; lon < 180; lon += step) {
      const fondo = Math.abs(lonDelta(lon, FONDO.lon));
      if (fondo < FONDO.flat + FONDO.ramp + 1) continue;
      // Ni contra un mamparo ni en el pasillo de los cajones (que tiene sus propias paredes).
      if (inCorridor(lon) || nearBulkhead(lon, 1.6)) continue;
      const half = floorHalfLat(floorRadius(lon));
      for (const sideLat of [half - 0.75, -(half - 0.75)]) {
        if (this.nearestSource(sideLat, lon) < 4.5) continue;
        // De espaldas al vidrio, mirando al pasillo.
        const f = this.at(sideLat, lon, sideLat > 0 ? 180 : 0);
        this.shelf(f);
      }
    }
  }

  /** Una estantería de piedra con tablillas (una pieza por balda, de color algo distinto). */
  private shelf(f: Frame): void {
    const v = this.pieces;
    v.add(P.pearlShade, box(), f.at([0, -0.22, 1.2], undefined, [2.2, 0.16, 2.4]));
    v.add(P.pearlShade, box(), f.at([-1.05, 0, 1.2], undefined, [0.12, 0.55, 2.4]));
    v.add(P.pearlShade, box(), f.at([1.05, 0, 1.2], undefined, [0.12, 0.55, 2.4]));
    const tones = [P.ivory, P.ivoryShade, P.paper, P.goldLight, P.steel];
    for (let k = 0; k < 4; k++) {
      const z = 0.3 + k * 0.6;
      v.add(P.pearl, box(), f.at([0, 0, z], undefined, [2.0, 0.5, 0.06]), 'stone', {
        solid: false,
      });
      const tone = tones[Math.floor(this.random() * tones.length)] ?? P.ivory;
      const fill = 0.6 + this.random() * 0.35;
      v.add(
        tone,
        box(),
        f.at([(1 - fill) * -0.9, 0, z + 0.22], undefined, [1.9 * fill, 0.36, 0.38]),
        'stone',
        {
          solid: false,
        },
      );
    }
    // Todo el mueble choca como una caja (las baldas sueltas no estorban).
    v.addCollider(
      box()
        .clone()
        .applyMatrix4(f.at([0, 0, 1.2], undefined, [2.2, 0.55, 2.4])),
    );
  }

  /** Farolas de oro a lo largo del pasillo, a un lado y al otro (en el Fondo, solo dos, frías). */
  private lamps(): void {
    let side = 1;
    for (let lon = -176; lon < 180; lon += 8) {
      side = -side;
      if (Math.abs(lonDelta(lon, FONDO.lon)) < FONDO.flat + FONDO.ramp + 2) continue;
      if (this.nearestSource(3.2 * side, lon) < 3.5) continue;
      if (nearBulkhead(lon, 1.2)) continue;
      if (Math.abs(lonDelta(lon, CELL_AT.lon)) < CELL_CLEAR) continue;
      const room = roomAt(lon);
      if (room.id === 'cajones') {
        this.ceilingLamp(lon, side, room.light, room.glow);
        continue;
      }
      this.lamp(this.at(3.2 * side, lon), room.light, GLOW * room.glow);
    }
    this.lamp(this.at(2.2, FONDO.lon - 2.2), P.lightCold, 1.4);
    this.lamp(this.at(-2.2, FONDO.lon + 2.2), P.lightCold, 1.4);
  }

  /** Una luz en lo alto de la pared de cajones (el pasillo es demasiado estrecho para farolas). */
  private ceilingLamp(lon: number, side: number, color: string, glow: number): void {
    this.pieces.add(color, ball(0.13, 1), this.at(side * 2.5, lon).at([0, 0, 3.3]), 'light', {
      glow: GLOW * glow,
      vary: 0,
      solid: false,
    });
  }

  /** El Planetario, las esferas y el prisma (T6). */
  private puzzles(): void {
    const context = {
      pieces: this.pieces,
      palette: P,
      markers: this.markers,
      at: (lat: number, lon: number, heading = 0) => this.at(lat, lon, heading),
    };
    buildArchivoPuzzles(context);
    buildArchivoDepths(context);
  }

  /** Las salas (plan de historia y puzzles físicos, §7.2): mamparos y lo que da carácter a cada una. */
  private rooms(): void {
    new RoomsBuilder({
      pieces: this.pieces,
      palette: P,
      at: (lat, lon, heading = 0) => this.at(lat, lon, heading),
      section: tubeSection,
      random: this.random,
    }).build();
  }

  private lamp(f: Frame, color: string, glow = GLOW): void {
    const v = this.pieces;
    v.add(P.steelDark, cylinder(0.18, 6), f.at([0, 0, 0.08], undefined, [1, 1, 0.16]), 'metal');
    v.add(P.steelDark, cylinder(0.06, 6), f.at([0, 0, 1.1], undefined, [1, 1, 2.0]), 'metal', {
      solid: true,
    });
    v.add(P.gold, torus(0.18, 0.03, 12, 4), f.at([0, 0, 2.15], [Math.PI / 2, 0, 0]), 'metal');
    v.add(color, ball(0.12, 1), f.at([0, 0, 2.15]), 'light', { glow, vary: 0 });
  }

  private source(id: ArchivoSourceId, f: Frame): void {
    const spec = ARCHIVO_SOURCES.find((s) => s.id === id);
    if (!spec) return;
    this.markers.push({
      name: `INT_${id}`,
      frame: f,
      at: [0, 0, spec.alto],
      props: { clue_id: `${ARCHIVO_ID}.${id}`, kind: spec.kind },
    });
  }

  private frameOf(id: ArchivoSourceId, heading = 0): Frame {
    const spec = ARCHIVO_SOURCES.find((s) => s.id === id);
    if (!spec) throw new Error(`Falta la fuente ${id}`);
    return this.at(spec.lat, spec.lon, heading);
  }

  private places(): void {
    this.greatHall();
    this.index();
    this.clockRoom();
    this.letters();
    this.desk();
    this.lightSlot();
    this.fondo();
  }

  /** La Gran Nave: el atril del informe oficial entre mesas de lectura. */
  private greatHall(): void {
    const v = this.pieces;
    const f = this.frameOf('informe_oficial', 90);
    v.add(P.pearlShade, cylinder(0.32, 8), f.at([0, 0, 0.5], undefined, [1, 1, 1.0]));
    v.add(P.ivoryShade, box(), f.at([0, 0, 1.12], [-0.35, 0, 0], [0.9, 0.62, 0.08]));
    v.add(P.paper, box(), f.at([0, 0.02, 1.18], [-0.35, 0, 0], [0.6, 0.42, 0.01]), 'stone', {
      solid: false,
    });
    this.source('informe_oficial', f);
    for (const [lat, lon] of [
      [2.2, -18],
      [-2.2, -18],
      [2.2, -5],
      [-2.2, -5],
    ] as const) {
      const t = this.at(lat, lon, 90);
      v.add(P.ivoryShade, box(), t.at([0, 0, 0.78], undefined, [1.0, 2.4, 0.08]));
      for (const y of [-0.9, 0.9]) {
        v.add(P.pearlShade, box(), t.at([0, y, 0.38], undefined, [0.8, 0.14, 0.76]));
      }
      v.add(P.paper, box(), t.at([0.1, -0.4, 0.83], [0, 0, 0.2], [0.3, 0.42, 0.01]), 'stone', {
        solid: false,
      });
    }
  }

  /** El Índice: un muro de registros con tres columnas vacías. */
  private index(): void {
    const v = this.pieces;
    const f = this.frameOf('indice', 180);
    // El muro queda detrás de la marca (hacia el vidrio del norte).
    v.add(P.pearlShade, box(), f.at([0, -0.75, 2.1], undefined, [6.2, 0.4, 4.2]));
    for (let col = 0; col < 7; col++) {
      const x = -2.7 + col * 0.9;
      const empty = col >= 2 && col <= 4;
      for (let row = 0; row < 7; row++) {
        const z = 0.6 + row * 0.5;
        if (empty) {
          v.add(P.ink, box(), f.at([x, -0.54, z], undefined, [0.7, 0.03, 0.38]), 'stone', {
            solid: false,
          });
        } else {
          const tone = this.random() < 0.5 ? P.ivory : P.paper;
          v.add(tone, box(), f.at([x, -0.52, z], undefined, [0.7, 0.04, 0.38]), 'stone', {
            solid: false,
          });
        }
      }
    }
    v.add(P.gold, box(), f.at([0, -0.53, 4.0], undefined, [6.0, 0.05, 0.12]), 'metal', {
      solid: false,
    });
    this.source('indice', f);
  }

  /** La Sala de Relojes: relojes en pie, cada uno con su ritmo y su etiqueta. */
  private clockRoom(): void {
    const v = this.pieces;
    const f = this.frameOf('sala_relojes');
    for (let k = 0; k < 7; k++) {
      const a = (200 + k * 23.3) * DEG;
      const x = 2.3 * Math.cos(a);
      const y = 2.3 * Math.sin(a) + 0.4;
      const height = 1.3 + (k % 3) * 0.25;
      v.add(
        P.steelDark,
        cylinder(0.07, 6),
        f.at([x, y, height / 2], undefined, [1, 1, height]),
        'metal',
        {
          solid: true,
        },
      );
      const face = f.at([x, y, height + 0.3], [Math.PI / 2, 0, a - Math.PI / 2]);
      v.add(
        P.ivory,
        cylinder(0.34, 16),
        face.clone().multiply(new Matrix4().makeScale(1, 1, 0.06)),
      );
      v.add(
        P.gold,
        torus(0.35, 0.03, 16, 4),
        face.clone().multiply(new Matrix4().makeRotationX(Math.PI / 2)),
        'metal',
      );
      v.add(
        P.ink,
        box(),
        face
          .clone()
          .multiply(new Matrix4().makeTranslation(0, 0.1, 0.04))
          .multiply(new Matrix4().makeRotationZ(k * 0.7))
          .multiply(new Matrix4().makeScale(0.03, 0.22, 0.01)),
        'metal',
        { solid: false },
      );
    }
    this.source('sala_relojes', f);
  }

  /** Las cartas que contestan antes, sobre una mesa. */
  private letters(): void {
    const v = this.pieces;
    const f = this.frameOf('cartas', 90);
    this.table(f, 0.95);
    for (let k = 0; k < 6; k++) {
      v.add(
        P.paper,
        box(),
        f.at(
          [-0.45 + k * 0.18, (k % 2) * 0.12 - 0.06, 0.97],
          [0, 0, k * 0.35 - 0.8],
          [0.22, 0.3, 0.01],
        ),
        'stone',
        {
          solid: false,
        },
      );
    }
    this.source('cartas', f);
  }

  /** El escritorio del archivista, con su silla y su lámpara. */
  private desk(): void {
    const v = this.pieces;
    const f = this.frameOf('escritorio', 90);
    this.table(f, 0.85);
    v.add(P.pearlShade, box(), f.at([0.9, 0, 0.25], undefined, [0.5, 0.5, 0.5]));
    v.add(P.pearlShade, box(), f.at([1.12, 0, 0.75], undefined, [0.08, 0.5, 0.6]));
    v.add(
      P.steelDark,
      cylinder(0.03, 6),
      f.at([-0.45, 0.35, 1.05], undefined, [1, 1, 0.4]),
      'metal',
      { solid: false },
    );
    v.add(P.light, ball(0.07, 1), f.at([-0.45, 0.35, 1.27]), 'light', { glow: GLOW, vary: 0 });
    v.add(P.paper, box(), f.at([0, -0.1, 0.87], [0, 0, 0.2], [0.42, 0.3, 0.01]), 'stone', {
      solid: false,
    });
    this.source('escritorio', f);
  }

  private table(f: Frame, height: number): void {
    const v = this.pieces;
    v.add(P.ivoryShade, box(), f.at([0, 0, height - 0.04], undefined, [1.5, 0.85, 0.08]));
    for (const [x, y] of [
      [-0.65, -0.35],
      [0.65, -0.35],
      [-0.65, 0.35],
      [0.65, 0.35],
    ] as const) {
      v.add(
        P.pearlShade,
        box(),
        f.at([x, y, (height - 0.08) / 2], undefined, [0.1, 0.1, height - 0.08]),
      );
    }
  }

  /** La tablilla de la ranura de luz: hacia las 4:00 la Brasa entra por un prisma del vidrio y cae sobre ella. */
  private lightSlot(): void {
    const v = this.pieces;
    const f = this.frameOf('ranura_luz');
    v.add(P.pearlShade, cylinder(0.4, 10), f.at([0, 0, 0.5], undefined, [1, 1, 1.0]));
    v.add(P.ivory, box(), f.at([0, 0, 1.08], [-0.3, 0, 0], [0.7, 0.5, 0.08]));
    v.add(P.gold, torus(0.5, 0.04, 16, 4), f.at([0, 0, 1.0], [Math.PI / 2, 0, 0]), 'metal');
    this.source('ranura_luz', f);
    const tablet = f.point([0, 0, 1.15]);
    const prism = prismPoint(tablet, this.sun);
    const up = prism.clone().normalize();
    const frame = new Matrix4().lookAt(prism, tablet, up).setPosition(prism);
    v.add(
      P.lightCold,
      cone(0.55, 0, 4),
      frame.clone().multiply(new Matrix4().makeScale(1, 1, 0.9)),
      'light',
      { glow: 1.6, vary: 0 },
    );
    this.beam.add(P.light, box(), beam(prism, tablet, 0.35, 0.35), 'light', { glow: 1.4, vary: 0 });
    this.beam.add(
      P.light,
      cylinder(0.32, 12),
      f.at([0, 0, 1.13], [-0.3, 0, 0], [1, 1, 0.01]),
      'light',
      {
        glow: 2.5,
        vary: 0,
      },
    );
  }

  /** El Fondo del Cañón: armarios cerrados en la parte hundida y oscura de la Galería. */
  private fondo(): void {
    const v = this.pieces;
    const f = this.frameOf('fondo_canon', 90);
    v.add(P.steelDark, box(), f.at([0, 0, 0.55], undefined, [0.5, 0.7, 1.1]));
    v.add(P.gold, box(), f.at([-0.26, 0, 0.9], undefined, [0.02, 0.5, 0.3]), 'metal', {
      solid: false,
    });
    this.source('fondo_canon', f);
    const half = floorHalfLat(FONDO.radius);
    for (let k = -2; k <= 2; k++) {
      for (const sideLat of [half - 0.7, -(half - 0.7)]) {
        const c = this.at(sideLat, FONDO.lon + k * 1.4, sideLat > 0 ? 180 : 0);
        v.add(P.steelDark, box(), c.at([0, 0, 1.0], undefined, [1.4, 0.6, 2.0]));
        v.add(P.gold, box(), c.at([0, 0.31, 1.0], undefined, [0.08, 0.02, 0.3]), 'metal', {
          solid: false,
        });
      }
    }
  }

  /**
   * La esclusa (🟡): un pozo de piedra cuadrado desde el fondo del mar hasta una cámara bajo el suelo de la
   * Galería, con una puerta al pie. Se entra buceando, se sube por el pozo (el agua llega hasta el vidrio, el
   * tubo está seco) y una rampa lleva de la cámara al suelo de la Galería. Marco: Y hacia el este, X hacia el sur.
   */
  private lock(): void {
    const v = this.pieces;
    const f = frameAt(sphereAt(SEABED), 0, LOCK.lon, { heading: 90 });
    const { half, wall, door, doorHalf, chamber } = LOCK;
    const outer = half + wall;
    const top = chamber - SEABED;
    const bottom = -0.6;
    const tall = top - bottom;
    const mid = (top + bottom) / 2;
    const stone = P.pearlShade;
    // Paredes: la del este entera, las de los lados y la del oeste con la puerta.
    v.add(stone, box(), f.at([0, half + wall / 2, mid], undefined, [outer * 2, wall, tall]));
    for (const x of [-(half + wall / 2), half + wall / 2]) {
      v.add(stone, box(), f.at([x, 0, mid], undefined, [wall, half * 2, tall]));
    }
    const sideWidth = outer - doorHalf;
    for (const x of [-(doorHalf + sideWidth / 2), doorHalf + sideWidth / 2]) {
      v.add(stone, box(), f.at([x, -(half + wall / 2), mid], undefined, [sideWidth, wall, tall]));
    }
    v.add(
      stone,
      box(),
      f.at([0, -(half + wall / 2), (door + top) / 2], undefined, [doorHalf * 2, wall, top - door]),
    );
    // La compuerta: un aro de oro alrededor de la puerta, dos luces y la marca de la tercera torre.
    const jamb = -(outer + 0.06);
    for (const x of [-(doorHalf + 0.08), doorHalf + 0.08]) {
      v.add(P.gold, box(), f.at([x, jamb, door / 2], undefined, [0.16, 0.12, door]), 'metal', {
        solid: false,
      });
    }
    v.add(
      P.gold,
      box(),
      f.at([0, jamb, door + 0.08], undefined, [doorHalf * 2 + 0.32, 0.12, 0.16]),
      'metal',
      {
        solid: false,
      },
    );
    for (const x of [-1.7, 1.7]) {
      v.add(P.light, ball(0.14, 1), f.at([x, -(outer + 0.1), 2.7]), 'light', {
        glow: GLOW,
        vary: 0,
      });
    }
    for (let k = 0; k < 3; k++) {
      v.add(
        P.goldLight,
        box(),
        f.at([0, -(outer + 0.03), door + 0.5 + k * 0.4], undefined, [1.2, 0.05, 0.14]),
        'light',
        {
          glow: 2,
          vary: 0,
        },
      );
    }
    // Dentro del pozo, una rampa pegada al lado sur sale del agua (al este) y sube hacia el oeste hasta lo alto de
    // la pared de la puerta, donde sigue la rampa de la cámara.
    v.add(
      stone,
      box(),
      f.base
        .clone()
        .multiply(rampMatrix([1.05, -half, top], [1.05, half, top - 2.7], 1.8, 0.35, 0.3)),
    );
    // La cámara: losa alrededor de la boca del pozo, cerrada por los dos extremos.
    const slab = 0.4;
    const west = -9.6;
    const east = 3;
    const width = 2.8;
    const z = top - slab / 2;
    for (const x of [-(half + (width - half) / 2), half + (width - half) / 2]) {
      v.add(
        stone,
        box(),
        f.at([x, (west + east) / 2, z], undefined, [width - half, east - west, slab]),
      );
    }
    v.add(stone, box(), f.at([0, (west - half) / 2, z], undefined, [half * 2, -half - west, slab]));
    v.add(stone, box(), f.at([0, (east + half) / 2, z], undefined, [half * 2, east - half, slab]));
    for (const y of [west - 0.2, east + 0.2]) {
      // Del vidrio de abajo hasta justo bajo el suelo de la Galería (el marco es plano y el suelo, curvo).
      const ceiling = Math.sqrt((FLOOR_RADIUS - 0.5) ** 2 - y * y) - SEABED;
      const floorOfWall = 4;
      v.add(
        stone,
        box(),
        f.at([0, y, (ceiling + floorOfWall) / 2], undefined, [
          width * 2 + 0.4,
          0.4,
          ceiling - floorOfWall,
        ]),
      );
    }
    // La rampa de la cámara al suelo de la Galería (por el hueco del suelo).
    const reach = Math.sin((LOCK.lon - LOCK_HOLE.from) * DEG) * FLOOR_RADIUS + 0.2;
    const floorTop = Math.sqrt((FLOOR_RADIUS - 0.02) ** 2 - reach * reach) - SEABED;
    v.add(
      stone,
      box(),
      f.base
        .clone()
        .multiply(rampMatrix([0, -reach, floorTop], [0, -half - 0.9, top], 2.0, 0.35, 0.6)),
    );
    // Una rueda de cierre y dos luces en la cámara; una farola a cada lado de la boca de la rampa arriba.
    v.add(P.gold, torus(0.45, 0.06, 16, 4), f.at([-2.2, east - 0.25, top + 1.3]), 'metal', {
      solid: false,
    });
    for (const y of [-3.2, -8.2]) {
      v.add(P.light, ball(0.12, 1), f.at([-2.4, y, top + 1.6]), 'light', { glow: GLOW, vary: 0 });
    }
    for (const lat of [LOCK_HOLE.halfLat + 0.6, -(LOCK_HOLE.halfLat + 0.6)]) {
      this.lamp(this.at(lat, LOCK_HOLE.from + 0.6), P.light);
    }
  }

  /**
   * Una torre (🟡): dos patas a los lados del tubo, desde el fondo hasta por encima del vidrio, unidas por un
   * dintel, con tantas bandas de luz como su número (la tercera, sobre la esclusa, lleva tres).
   */
  private tower(number: number, lon: number): void {
    const v = this.pieces;
    const crown = TUBE_MAJOR + 16;
    const legs = [TOWER_LAT, -TOWER_LAT].map((lat) => {
      const f = frameAt(this.seabed, lat, lon);
      const ground = this.seabed.groundRadius(direction(lat, lon));
      const length = crown - ground + 1;
      v.add(
        P.pearlShade,
        cylinder(1.3, 10),
        f.at([0, 0, length / 2 - 1], undefined, [1, 1, length]),
      );
      for (let k = 0; k < number; k++) {
        v.add(
          P.light,
          torus(1.42, 0.12, 16, 4),
          f.at([0, 0, TUBE_MAJOR + 6 + k * 1.3 - ground], [Math.PI / 2, 0, 0]),
          'light',
          {
            glow: 2.4,
            vary: 0,
          },
        );
      }
      v.add(P.gold, cone(1.0, 0, 8), f.at([0, 0, length - 0.2], undefined, [1, 1, 1.6]), 'metal');
      return direction(lat, lon).multiplyScalar(crown - 1);
    });
    const [north, south] = legs as [Vector3, Vector3];
    v.add(P.pearl, box(), beam(north, south, 1.6, 1.4));
    // Las cunas que abrazan el tubo a cada lado de la torre, colgadas de las patas.
    for (const offset of [-3, 3]) {
      const at = lon + offset;
      v.add(P.gold, torus(TUBE_MINOR + 0.35, 0.3, 40, 5), tubeSection(at), 'metal', {
        solid: false,
      });
      for (const lat of [TOWER_LAT, -TOWER_LAT]) {
        const leg = direction(lat, lon).multiplyScalar(TUBE_MAJOR);
        const cradle = tubePoint(at, lat > 0 ? 90 : -90, TUBE_MINOR + 0.35);
        v.add(P.steel, box(), beam(leg, cradle, 0.35, 0.35), 'metal', { solid: false });
      }
    }
  }
}
