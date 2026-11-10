// Lo que comparten los lugares de Hogar (Fase 11G): la paleta del lenguaje de los Ool (telas cosidas en gajos de
// colores sobre costillas de madera, puertas redondas, musgo y luz viva verde azulada; CONTEXTO_PLANETAS.md §9), el
// constructor que acumula piezas, marcas y Ool, y las piezas que se repiten (casas, farolas de bulbo, arcos de lona).
import { Quaternion, Vector3, type BufferGeometry } from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  domeShell,
  frameAt,
  PieceSet,
  torus,
  torusArc,
  type Frame,
  type MarkerProps,
  type Triple,
} from './kit';
import { seededRandom, type Random } from './noise';
import { hogarSurface, HOGAR_RADIUS, SITES, type SiteId } from './hogarShape';
import type { OolSpec } from './ool';

export const HOGAR_PALETTE = {
  grass: '#7fa04e',
  grassLight: '#9cb85c',
  grassDry: '#b8a85e',
  moss: '#5f8a4a',
  mossDark: '#476b3a',
  soil: '#8a6a48',
  soilDark: '#6b5038',
  sand: '#d8c490',
  rock: '#8c8274',
  rockDark: '#6a6258',
  path: '#c9b590',
  paving: '#d6c7a4',
  wood: '#8a6844',
  woodDark: '#6a4c32',
  leather: '#6b4630',
  straw: '#d8bd73',
  rib: '#7a5a3a',
  cream: '#efe2c4',
  ochre: '#c8913f',
  rust: '#b5532e',
  teal: '#4f9a8f',
  sage: '#9db08a',
  plum: '#8a5a6a',
  sky: '#7fa7c4',
  brass: '#c9a24a',
  brassDark: '#9b7b35',
  iron: '#6f6a64',
  ironRust: '#8a5a3e',
  slate: '#5b6670',
  sandstone: '#c9a77e',
  glow: '#a8ffe8',
  glowWarm: '#ffe08a',
  water: '#4f9fb8',
} as const;
const P = HOGAR_PALETTE;

/** Los colores de las telas de las casas: se cosen en gajos alternos. */
export const FABRICS = [P.cream, P.ochre, P.sage, P.rust, P.teal, P.plum, P.sky] as const;

const DEG = Math.PI / 180;

export interface PendingMarker {
  name: string;
  frame: Frame;
  at: Triple;
  props?: MarkerProps;
}

export interface PlacedOol {
  spec: OolSpec;
  frame: Frame;
  at: Triple;
  /** Hacia dónde mira, en grados desde el +Y del marco hacia +X. */
  turn: number;
}

/** Una pieza que gira sobre su Y local (ANIM_): sus piezas se construyen con Y como eje de giro. */
export interface Spinner {
  name: string;
  position: Vector3;
  quaternion: Quaternion;
  spin: number;
  set: PieceSet;
}

export interface HouseOptions {
  radius: number;
  height: number;
  /** Los dos colores de tela; si no, dos al azar de FABRICS. */
  fabrics?: readonly [string, string];
  /** Un segundo piso, más estrecho. */
  storeys?: 1 | 2;
  /** Hacia dónde da la puerta (grados desde +Y hacia +X). */
  door?: number;
}

/** Acumula las piezas del mundo (por material), sus marcas y sus Ool. */
export class HogarBuilder {
  readonly pieces = new PieceSet(61);
  /** Vidrio (vitrinas, el casco de burbuja, ventanas). */
  readonly glass: BufferGeometry[] = [];
  /** Agua quieta de adorno (acequias, la fuente): no se nada en ella. */
  readonly still: BufferGeometry[] = [];
  readonly markers: PendingMarker[] = [];
  readonly ools: PlacedOol[] = [];
  /** Piezas que se quitan en el Hogar de antes (game/homecoming.ts). */
  readonly showcase = new PieceSet(62);
  readonly spinners: Spinner[] = [];
  readonly random: Random = seededRandom(63);

  /** Una pieza que gira (ANIM_<name>) en `at`; `axis` lleva su Y local al eje de giro, en el marco del lugar. */
  spinner(name: string, frame: Frame, at: Triple, axis: Quaternion, spin: number): PieceSet {
    const set = new PieceSet(70 + this.spinners.length);
    this.spinners.push({
      name,
      position: frame.point(at),
      quaternion: frame.rotation().multiply(axis),
      spin,
      set,
    });
    return set;
  }

  /** El marco de un lugar: en su llano, con +Y hacia `heading`. */
  site(id: SiteId, heading = 0): Frame {
    const s = SITES[id];
    return frameAt(hogarSurface, s.lat, s.lon, { heading });
  }

  /** Un marco a `east` y `north` metros de un lugar (sobre el suelo, lo más bajo de un círculo de `footprint`). */
  near(id: SiteId, east: number, north: number, heading = 0, footprint = 1.5): Frame {
    const s = SITES[id];
    const lat = s.lat + north / HOGAR_RADIUS / DEG;
    const lon = s.lon + east / HOGAR_RADIUS / DEG / Math.max(0.2, Math.cos(s.lat * DEG));
    return frameAt(hogarSurface, lat, lon, { heading, footprint });
  }

  /** Un marco en cualquier sitio. */
  at(lat: number, lon: number, heading = 0, footprint = 1.5): Frame {
    return frameAt(hogarSurface, lat, lon, { heading, footprint });
  }

  mark(name: string, frame: Frame, at: Triple, props?: MarkerProps): void {
    this.markers.push(props ? { name, frame, at, props } : { name, frame, at });
  }

  /** Una fuente del Registro: la marca INT_ con su pista y su tipo. */
  source(clueId: string, kind: string, frame: Frame, at: Triple): void {
    const short = clueId.slice(clueId.indexOf('.') + 1);
    this.mark(`INT_${short}`, frame, at, { clue_id: clueId, kind });
  }

  /** Un Ool de pie en `at`, mirando hacia `turn`; con una columna de colisión para no atravesarlo. */
  ool(spec: OolSpec, frame: Frame, at: Triple, turn = 0): void {
    this.ools.push({ spec, frame, at, turn });
    const collider = cylinder(1, 8)
      .clone()
      .applyMatrix4(frame.at([at[0], at[1], at[2] + 0.6], undefined, [0.28, 0.28, 1.2]));
    this.pieces.addCollider(collider);
  }

  /** Una farola de bulbo: un tallo curvo con su luz viva. */
  bulbLamp(frame: Frame, at: Triple, height = 2.4, warm = false): void {
    const [x, y, z] = at;
    this.pieces.add(
      P.woodDark,
      cylinder(0.06, 5),
      frame.at([x, y, z + height / 2], undefined, [1, 1, height]),
      'stone',
      { solid: true },
    );
    this.pieces.add(
      P.woodDark,
      torusArc(0.3, 0.04, 0, Math.PI, 8, 4),
      frame.at([x + 0.3, y, z + height], [0, 0, 0]),
      'stone',
      { solid: false },
    );
    this.pieces.add(
      warm ? P.glowWarm : P.glow,
      ball(0.16, 0),
      frame.at([x + 0.6, y, z + height - 0.25]),
      'light',
      { glow: 1.6, vary: 0 },
    );
    this.pieces.add(P.moss, ball(0.12, 0), frame.at([x, y, z + height + 0.02]), 'stone', {
      solid: false,
    });
  }

  /**
   * Una casa de los Ool: gajos de tela sobre costillas de madera, techo de cúpula con musgo, puerta y ventanas
   * redondas, y una luz junto a la puerta. Cerrada: su colisión es un cilindro.
   */
  house(frame: Frame, at: Triple, options: HouseOptions): void {
    const { radius, height, storeys = 1, door = 0 } = options;
    const fabrics = options.fabrics ?? this.twoFabrics();
    this.drum(frame, at, radius, height, fabrics, door, true);
    if (storeys === 2) {
      const upper: Triple = [at[0], at[1], at[2] + height];
      this.drum(
        frame,
        upper,
        radius * 0.72,
        height * 0.8,
        [fabrics[1], fabrics[0]],
        door + 180,
        false,
      );
      this.roof(frame, [at[0], at[1], at[2] + height * 1.8], radius * 0.72);
    } else {
      this.roof(frame, [at[0], at[1], at[2] + height], radius);
    }
    this.pieces.addCollider(
      cylinder(1, 10)
        .clone()
        .applyMatrix4(
          frame.at([at[0], at[1], at[2] + height / 2], undefined, [radius, radius, height]),
        ),
    );
    const d = door * DEG;
    const out = (r: number, z: number): Triple => [
      at[0] + Math.sin(d) * r,
      at[1] + Math.cos(d) * r,
      at[2] + z,
    ];
    this.bulbLamp(frame, out(radius + 0.6, 0), 1.8, true);
  }

  private twoFabrics(): readonly [string, string] {
    const a = Math.floor(this.random() * FABRICS.length);
    const b = (a + 1 + Math.floor(this.random() * (FABRICS.length - 1))) % FABRICS.length;
    return [FABRICS[a] ?? P.cream, FABRICS[b] ?? P.ochre];
  }

  /** Un tambor de gajos con su puerta (o ventana) redonda hacia `door`. */
  private drum(
    frame: Frame,
    at: Triple,
    radius: number,
    height: number,
    fabrics: readonly [string, string],
    door: number,
    withDoor: boolean,
  ): void {
    const gores = 10;
    const width = (2 * Math.PI * radius) / gores + 0.02;
    for (let k = 0; k < gores; k++) {
      const a = (k / gores) * Math.PI * 2;
      const color = k % 2 === 0 ? fabrics[0] : fabrics[1];
      const m = frame.at(
        [at[0] + Math.sin(a) * radius, at[1] + Math.cos(a) * radius, at[2] + height / 2],
        [0, 0, -a],
        [width, 0.1, height],
      );
      this.pieces.add(color, box(), m, 'stone', { solid: false });
      // Costilla entre gajo y gajo.
      const b = a + Math.PI / gores;
      this.pieces.add(
        P.rib,
        box(),
        frame.at(
          [
            at[0] + Math.sin(b) * (radius + 0.05),
            at[1] + Math.cos(b) * (radius + 0.05),
            at[2] + height / 2,
          ],
          [0, 0, -b],
          [0.09, 0.09, height],
        ),
        'stone',
        { solid: false },
      );
    }
    const d = door * DEG;
    const face = (r: number, z: number): Triple => [
      at[0] + Math.sin(d) * r,
      at[1] + Math.cos(d) * r,
      at[2] + z,
    ];
    if (withDoor) {
      const h = Math.min(1.7, height * 0.75);
      this.pieces.add(
        P.woodDark,
        cylinder(0.55, 10),
        frame.at(face(radius + 0.06, h / 2), [Math.PI / 2, 0, -d], [1, h / 1.1, 0.06]),
        'stone',
        { solid: false },
      );
      this.pieces.add(P.brass, ball(0.05, 0), frame.at(face(radius + 0.11, h * 0.5)), 'metal', {
        solid: false,
      });
    }
    for (const side of [-1, 1]) {
      const w = d + side * 0.9;
      this.pieces.add(
        P.glowWarm,
        cylinder(0.22, 8),
        frame.at(
          [
            at[0] + Math.sin(w) * (radius + 0.04),
            at[1] + Math.cos(w) * (radius + 0.04),
            at[2] + height * 0.62,
          ],
          [Math.PI / 2, 0, -w],
          [1, 1, 0.04],
        ),
        'light',
        { glow: 1.1, vary: 0 },
      );
      this.pieces.add(
        P.rib,
        torus(0.24, 0.035, 8, 3),
        frame.at(
          [
            at[0] + Math.sin(w) * (radius + 0.07),
            at[1] + Math.cos(w) * (radius + 0.07),
            at[2] + height * 0.62,
          ],
          [0, 0, -w],
        ),
        'stone',
        { solid: false },
      );
    }
  }

  /** Techo de cúpula con un aro, sus costillas y matas de musgo. */
  private roof(frame: Frame, at: Triple, radius: number): void {
    const rise = radius * 0.7;
    this.pieces.add(
      P.moss,
      domeShell(1),
      frame.at(at, undefined, [radius * 1.08, radius * 1.08, rise]),
      'stone',
      { solid: false },
    );
    this.pieces.add(
      P.rib,
      torus(radius * 1.06, 0.07, 16, 3),
      frame.at([at[0], at[1], at[2] + 0.05], [Math.PI / 2, 0, 0]),
      'stone',
      { solid: false },
    );
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI;
      this.pieces.add(
        P.rib,
        torusArc(1, 0.035, 0, Math.PI, 8, 3),
        frame.at(at, [0, 0, a], [radius * 1.09, 1, rise * 1.02]),
        'stone',
        { solid: false },
      );
    }
    for (let k = 0; k < 5; k++) {
      const a = this.random() * Math.PI * 2;
      const r = radius * (0.3 + this.random() * 0.6);
      const z = rise * Math.sqrt(Math.max(0, 1 - (r / (radius * 1.08)) ** 2));
      this.pieces.add(
        this.random() < 0.5 ? P.mossDark : P.grassLight,
        ball(0.25 + this.random() * 0.2, 0),
        frame.at([at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r, at[2] + z]),
        'stone',
        { solid: false },
      );
    }
    this.pieces.add(P.glow, ball(0.12, 0), frame.at([at[0], at[1], at[2] + rise + 0.1]), 'light', {
      glow: 1.4,
      vary: 0,
    });
  }

  /**
   * Una pasarela cubierta: postes a los dos lados, un aro en cada par y, encima, una bóveda de gajos de lona (de
   * colores alternos, como las casas). Se pasa por debajo; los postes chocan.
   */
  arcade(frame: Frame, from: Triple, to: Triple, width = 2.6, height = 2.3): void {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const along = b.clone().sub(a);
    const length = along.length();
    const yaw = Math.atan2(-along.x, along.y);
    const half = width / 2;
    const rise = width * 0.42;
    const hoops = Math.max(2, Math.round(length / 1.8));
    const across = new Vector3(Math.cos(yaw), Math.sin(yaw), 0);
    for (let k = 0; k <= hoops; k++) {
      const p = a.clone().addScaledVector(along, k / hoops);
      for (const side of [-1, 1]) {
        const foot = p.clone().addScaledVector(across, side * half);
        this.pieces.add(
          P.rib,
          cylinder(0.08, 6),
          frame.at([foot.x, foot.y, foot.z + height / 2], undefined, [1, 1, height]),
          'stone',
          { solid: true },
        );
      }
      this.pieces.add(
        P.rib,
        torusArc(1, 0.07, 0, Math.PI, 12, 4),
        frame.at([p.x, p.y, p.z + height], [0, 0, yaw], [half, 1, rise]),
        'stone',
        { solid: false },
      );
    }
    // Las vigas de los lados, de poste a poste.
    const middle = a.clone().add(b).multiplyScalar(0.5);
    for (const side of [-1, 1]) {
      const beam = middle.clone().addScaledVector(across, side * half);
      this.pieces.add(
        P.rib,
        box(),
        frame.at([beam.x, beam.y, beam.z + height], [0, 0, yaw], [0.12, length, 0.12]),
        'stone',
        { solid: false },
      );
    }
    this.vault(
      frame,
      [middle.x, middle.y, middle.z + height + 0.04],
      yaw,
      half + 0.08,
      rise + 0.06,
      length + 0.5,
      [P.cream, P.ochre],
    );
  }

  /**
   * Una bóveda de lona sobre un eje horizontal: medio óvalo de `half` de ancho y `rise` de alto, de `length` de
   * largo hacia +Y del marco girado `yaw`, hecho de gajos (tablas finas) que se ven por dentro y por fuera.
   */
  vault(
    frame: Frame,
    at: Triple,
    yaw: number,
    half: number,
    rise: number,
    length: number,
    colors: readonly string[],
    gores = 8,
  ): void {
    const point = (k: number): [number, number] => {
      const t = (k / gores) * Math.PI;
      return [Math.cos(t) * half, Math.sin(t) * rise];
    };
    for (let k = 0; k < gores; k++) {
      const [x0, z0] = point(k);
      const [x1, z1] = point(k + 1);
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const chord = Math.hypot(x1 - x0, z1 - z0);
      const slope = Math.atan2(z1 - z0, x1 - x0);
      this.pieces.add(
        colors[k % colors.length] ?? P.cream,
        box(),
        frame.at(
          [at[0] + Math.cos(yaw) * mx, at[1] + Math.sin(yaw) * mx, at[2] + mz],
          [0, -slope, yaw],
          [chord + 0.03, length, 0.05],
        ),
        'stone',
        { solid: false },
      );
    }
  }

  /** Un árbol de musgo: tronco blando y copa redonda con frutos de luz. */
  mossTree(frame: Frame, at: Triple, size = 1, fruits = 4): void {
    const [x, y, z] = at;
    this.pieces.add(
      P.woodDark,
      cone(0.45 * size, 0.28 * size, 8),
      frame.at([x, y, z + 1.4 * size], undefined, [1, 1, 2.8 * size]),
      'stone',
      { solid: true },
    );
    const crowns: Triple[] = [
      [0, 0, 3.6],
      [0.9, 0.3, 3.2],
      [-0.7, -0.6, 3.2],
    ];
    for (const [cx, cy, cz] of crowns) {
      this.pieces.add(
        this.random() < 0.5 ? P.moss : P.mossDark,
        ball(1, 1),
        frame.at([x + cx * size, y + cy * size, z + cz * size], undefined, [
          1.3 * size,
          1.3 * size,
          1.05 * size,
        ]),
        'stone',
        { solid: false },
      );
    }
    for (let k = 0; k < fruits; k++) {
      const a = this.random() * Math.PI * 2;
      this.pieces.add(
        P.glow,
        ball(0.13 * size, 0),
        frame.at([
          x + Math.cos(a) * 1.3 * size,
          y + Math.sin(a) * 1.3 * size,
          z + (2.4 + this.random() * 0.6) * size,
        ]),
        'light',
        { glow: 1.5, vary: 0 },
      );
    }
  }

  /** Un rótulo o una nota clavada en un poste. */
  sign(frame: Frame, at: Triple, turn = 0, color: string = P.cream): void {
    const t = turn * DEG;
    this.pieces.add(
      P.woodDark,
      cylinder(0.05, 5),
      frame.at([at[0], at[1], at[2] + 0.6], undefined, [1, 1, 1.2]),
      'stone',
      { solid: false },
    );
    this.pieces.add(
      P.wood,
      box(),
      frame.at([at[0], at[1], at[2] + 1.15], [0, 0, -t], [0.7, 0.06, 0.45]),
      'stone',
      { solid: false },
    );
    this.pieces.add(
      color,
      box(),
      frame.at(
        [at[0] + Math.sin(t) * 0.035, at[1] + Math.cos(t) * 0.035, at[2] + 1.15],
        [0, 0, -t],
        [0.55, 0.01, 0.32],
      ),
      'stone',
      { solid: false },
    );
  }

  /** Un trozo de agua quieta (una lámina) de `w` × `l` metros. */
  stillWater(frame: Frame, at: Triple, w: number, l: number, turn = 0): void {
    this.still.push(
      box()
        .clone()
        .applyMatrix4(frame.at(at, [0, 0, turn * DEG], [w, l, 0.02])),
    );
  }

  /** Agua quieta redonda (una pila, una taza): un disco de `radius` a la altura de `at`. */
  stillDisc(frame: Frame, at: Triple, radius: number): void {
    this.still.push(
      cylinder(1, 28)
        .clone()
        .applyMatrix4(frame.at(at, undefined, [radius, radius, 0.02])),
    );
  }

  /** Una caja de piezas cualquiera, para quien construya un lugar a mano. */
  add(
    color: string,
    geometry: BufferGeometry,
    frame: Frame,
    at: Triple,
    rotation?: Triple,
    scale?: Triple,
    solid?: boolean,
  ): void {
    this.pieces.add(
      color,
      geometry,
      frame.at(at, rotation, scale),
      'stone',
      solid === undefined ? {} : { solid },
    );
  }
}
