// Los Ool hechos por código (Fase 11G; ✅ el aspecto, lámina "Propuesta 4" de Anthony): cuerpo de fibras como musgo
// con motas de luz, dos ojos grandes y oscuros, manos y pies de cuatro dedos y filamentos en la cabeza que brillan.
// ✅ La edad se ve (Anthony, 2026-11-03): los jóvenes son de un verde agua claro y dan mucha luz; al crecer se oscurecen
// hacia un gris verdoso y su luz se apaga (oolLook). La ropa es de cada uno (🟡).
//
// Cada Ool es un grupo OOL_<quién> con Y local hacia arriba y el frente hacia −Z (render/oolView.ts los hace respirar
// y girarse), con lo que brilla en su hijo OOL_<quién>_Luz. Se modela en el marco de siempre (Z arriba, frente +Y)
// y se gira al final.
import {
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  ball,
  box,
  clamp,
  cone,
  cylinder,
  pieceMatrix,
  PieceSet,
  smoothstep,
  torus,
  type Triple,
} from './kit';
import { seededRandom, type Random } from './noise';

/** De joven (0) a viejo (1). */
export type OolAge = number;

export type OolOutfit =
  | 'ninguna'
  | 'maestra'
  | 'directora'
  | 'tecnico'
  | 'mecanica'
  | 'tejedora'
  | 'pescador'
  | 'campesino'
  | 'vecino'
  | 'cria';

export interface OolSpec {
  id: string;
  age: OolAge;
  outfit: OolOutfit;
  /** Para que dos Ool de la misma edad no sean idénticos. */
  seed?: number;
  /** Lo que hace con las manos: nada, leer (un libro abierto) o algo en la mano derecha. */
  holding?: 'nada' | 'libro' | 'cesta' | 'herramienta' | 'ovillo' | 'cana';
}

export interface OolLook {
  /** El musgo del cuerpo y el de las puntas de las fibras. */
  body: Color;
  fiber: Color;
  /** El color de la luz y cuánto brilla (emissiveIntensity). */
  glow: Color;
  glowIntensity: number;
  /** Cuántas motas de luz tiene y cuánto miden los filamentos. */
  dots: number;
  filamentLength: number;
  /** Cuántas fibras sueltas (los mayores son más greñudos). */
  fibers: number;
  /** Altura relativa (las crías son pequeñas). */
  size: number;
}

const YOUNG_BODY = new Color('#9fe6c9');
const OLD_BODY = new Color('#4b5a50');
const YOUNG_GLOW = new Color('#fff27a');
const OLD_GLOW = new Color('#c9a95a');

/**
 * ✅ El color y la luz por la edad: de verde agua claro y muy luminoso a gris verdoso oscuro y apagado. Las crías,
 * además, son pequeñas.
 */
export function oolLook(age: OolAge): OolLook {
  const a = clamp(age, 0, 1);
  const body = YOUNG_BODY.clone().lerp(OLD_BODY, a);
  return {
    body,
    fiber: body.clone().offsetHSL(0, -0.05, a > 0.5 ? -0.06 : 0.05),
    glow: YOUNG_GLOW.clone().lerp(OLD_GLOW, a),
    glowIntensity: 2.4 - 1.95 * a,
    dots: Math.round(18 - 13 * a),
    filamentLength: 0.26 - 0.08 * a,
    fibers: Math.round(18 + 42 * a),
    size: 0.55 + 0.45 * smoothstep(0, 0.3, a),
  };
}

const P = {
  eye: '#15181d',
  shine: '#f4fbff',
  brass: '#c9a24a',
  lens: '#9fd8e0',
  leather: '#6b4630',
  leatherDark: '#4a2f22',
  rust: '#b5532e',
  coat: '#5d4a3f',
  coatPattern: '#c49a5c',
  cream: '#efe2c4',
  page: '#f6eedb',
  ochre: '#c8913f',
  olive: '#6f7a45',
  oliveDark: '#565f36',
  straw: '#d8bd73',
  sash: '#3f5d78',
  indigo: '#46507f',
  wool: '#c4473d',
  wood: '#8a6844',
} as const;

/** Del marco de diseño (Z arriba, frente +Y) al del Ool (Y arriba, frente −Z). */
const DESIGN_TO_OOL = new Matrix4().makeRotationX(-Math.PI / 2);
/** Y al revés: el grupo del Ool colgado de un marco de lugar (Z arriba, +Y el rumbo) mira hacia ese rumbo. */
export const OOL_UPRIGHT = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

/** Un palo de `from` a `to` (marco de diseño). */
function limb(from: Triple, to: Triple, radius: number): Matrix4 {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const along = b.clone().sub(a);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), along.clone().normalize());
  return new Matrix4().compose(
    a.add(b).multiplyScalar(0.5),
    q,
    new Vector3(radius, radius, along.length()),
  );
}

class OolModel {
  readonly set: PieceSet;
  private readonly random: Random;

  constructor(
    readonly spec: OolSpec,
    readonly look: OolLook,
  ) {
    this.set = new PieceSet(spec.seed ?? 7);
    this.random = seededRandom(spec.seed ?? 7);
  }

  body(color: string | Color, geometry: BufferGeometry, matrix: Matrix4): void {
    this.set.add(color, geometry, matrix, 'stone', { solid: false });
  }

  light(geometry: BufferGeometry, matrix: Matrix4): void {
    this.set.add(this.look.glow, geometry, matrix, 'light', { solid: false, vary: 0 });
  }

  build(): void {
    const { look } = this;
    const moss = look.body;
    // Pies de cuatro dedos y piernas cortas.
    for (const x of [-0.12, 0.12]) {
      this.body(moss, ball(1, 0), pieceMatrix([x, 0.04, 0.04], [0, 0, 0], [0.1, 0.15, 0.055]));
      for (let k = 0; k < 4; k++) {
        const t = (k - 1.5) * 0.045;
        this.body(moss, ball(0.03, 0), pieceMatrix([x + t, 0.18, 0.03]));
      }
      this.body(moss, cylinder(1, 5), limb([x, 0.02, 0.06], [x * 0.9, 0, 0.32], 0.065));
    }
    // El cuerpo y la cabeza, sin cuello: una pera blanda.
    this.body(moss, ball(1, 1), pieceMatrix([0, 0, 0.56], [0, 0, 0], [0.3, 0.27, 0.36]));
    this.body(moss, ball(1, 1), pieceMatrix([0, 0.01, 1.04], [0, 0, 0], [0.31, 0.29, 0.27]));
    // Los ojos grandes y oscuros, con su brillo.
    for (const x of [-0.11, 0.11]) {
      this.body(P.eye, ball(1, 1), pieceMatrix([x, 0.255, 1.07], [0, 0, 0], [0.075, 0.035, 0.095]));
      this.body(P.shine, ball(0.018, 0), pieceMatrix([x - 0.022, 0.288, 1.11]));
    }
    this.arms();
    this.fibers();
    this.filaments();
    this.dots();
    this.outfit();
    this.holding();
  }

  private arms(): void {
    const moss = this.look.body;
    for (const side of [-1, 1]) {
      const shoulder: Triple = [side * 0.27, 0.02, 0.74];
      const hand: Triple = [side * 0.33, 0.1, 0.46];
      this.body(moss, cylinder(1, 6), limb(shoulder, hand, 0.055));
      this.body(moss, ball(0.06, 1), pieceMatrix(hand));
      // Cuatro dedos.
      for (let k = 0; k < 4; k++) {
        const a = (k - 1.5) * 0.4;
        const tip: Triple = [
          hand[0] + side * 0.02 + Math.sin(a) * 0.05,
          hand[1] + 0.05,
          hand[2] - 0.04 + Math.cos(a) * 0.01,
        ];
        this.body(moss, cylinder(1, 4), limb(hand, tip, 0.016));
      }
    }
  }

  /** Fibras sueltas por la cabeza y el cuerpo: el musgo. */
  private fibers(): void {
    const { look } = this;
    for (let k = 0; k < look.fibers; k++) {
      const onHead = this.random() < 0.55;
      const center: Triple = onHead ? [0, 0.01, 1.04] : [0, 0, 0.56];
      const radii: Triple = onHead ? [0.31, 0.29, 0.27] : [0.3, 0.27, 0.36];
      const theta = this.random() * Math.PI * 2;
      const z = this.random() * 1.6 - 0.6;
      const ring = Math.sqrt(Math.max(0, 1 - z * z));
      const n = new Vector3(ring * Math.cos(theta), ring * Math.sin(theta), z);
      // Nada de fibras sobre los ojos.
      if (onHead && n.y > 0.55 && Math.abs(n.z) < 0.6) continue;
      const base = new Vector3(n.x * radii[0], n.y * radii[1], n.z * radii[2]).add(
        new Vector3(...center),
      );
      const length = 0.05 + this.random() * (0.05 + 0.06 * this.spec.age);
      const tip = base
        .clone()
        .addScaledVector(n, length)
        .add(new Vector3(0, 0, -length * 0.3));
      this.body(
        this.random() < 0.5 ? look.fiber : look.body,
        cone(1, 0, 3),
        limb([base.x, base.y, base.z], [tip.x, tip.y, tip.z], 0.03),
      );
    }
  }

  /** Los filamentos de la cabeza, con la punta que brilla. La Directora lleva tres, largos. */
  private filaments(): void {
    const director = this.spec.outfit === 'directora';
    const count = director ? 3 : 5;
    const length = this.look.filamentLength * (director ? 1.5 : 1);
    for (let k = 0; k < count; k++) {
      const a = ((k - (count - 1) / 2) / Math.max(1, count - 1)) * (director ? 0.9 : 1.4);
      const base: Triple = [Math.sin(a) * 0.12, -0.02, 1.27];
      const mid: Triple = [Math.sin(a) * (0.16 + length * 0.3), -0.05, 1.27 + length * 0.6];
      const tip: Triple = [
        Math.sin(a) * (0.2 + length * 0.6),
        -0.02 + length * 0.15,
        1.27 + length * 0.95,
      ];
      this.body(this.look.fiber, cylinder(1, 4), limb(base, mid, 0.018));
      this.body(this.look.fiber, cylinder(1, 4), limb(mid, tip, 0.014));
      this.light(ball(0.034, 0), pieceMatrix(tip));
    }
  }

  /** Las motas de luz: en las mejillas y por el cuerpo. */
  private dots(): void {
    for (let k = 0; k < this.look.dots; k++) {
      const onHead = k % 3 !== 2;
      const theta = Math.PI / 2 + (this.random() - 0.5) * 2.4;
      const z = (this.random() - 0.5) * (onHead ? 0.5 : 1.1);
      const ring = Math.sqrt(Math.max(0, 1 - z * z));
      if (onHead && Math.abs(Math.cos(theta)) < 0.45 && z > -0.3) continue; // sin tapar los ojos
      const radii: Triple = onHead ? [0.315, 0.295, 0.275] : [0.305, 0.275, 0.365];
      const center: Triple = onHead ? [0, 0.01, 1.04] : [0, 0, 0.56];
      this.light(
        ball(0.017 + this.random() * 0.01, 0),
        pieceMatrix([
          center[0] + ring * Math.cos(theta) * radii[0],
          center[1] + ring * Math.sin(theta) * radii[1],
          center[2] + z * radii[2],
        ]),
      );
    }
  }

  private outfit(): void {
    switch (this.spec.outfit) {
      case 'maestra':
        this.coat(P.coat, P.coatPattern, 0.18);
        this.scarf(P.rust);
        this.goggles(false);
        this.satchel();
        break;
      case 'directora':
        this.coat(P.cream, P.ochre, 0.1);
        this.body(P.sash, box(), pieceMatrix([0, 0.05, 0.72], [0, 0.5, 0], [0.12, 0.33, 0.7]));
        this.body(P.brass, torus(0.06, 0.012, 16, 4), pieceMatrix([0, 0.29, 0.78]));
        break;
      case 'tecnico':
        this.body(P.leather, box(), pieceMatrix([0, 0.25, 0.55], [0.1, 0, 0], [0.4, 0.05, 0.5]));
        this.goggles(true);
        break;
      case 'mecanica':
        this.body(P.olive, cone(0.33, 0.28, 10), pieceMatrix([0, 0, 0.5], [0, 0, 0], [1, 1, 0.5]));
        this.body(
          P.leatherDark,
          torus(0.31, 0.03, 16, 4),
          pieceMatrix([0, 0, 0.42], [Math.PI / 2, 0, 0]),
        );
        for (const x of [-0.18, 0.2])
          this.body(P.leather, box(), pieceMatrix([x, 0.22, 0.4], [0, 0, 0], [0.1, 0.06, 0.1]));
        this.cap(P.oliveDark);
        break;
      case 'tejedora':
        this.body(P.wool, cone(0.36, 0.2, 10), pieceMatrix([0, 0, 0.78], [0, 0, 0], [1, 1, 0.2]));
        this.body(P.cream, cone(0.37, 0.3, 10), pieceMatrix([0, 0, 0.68], [0, 0, 0], [1, 1, 0.06]));
        break;
      case 'pescador':
        this.hat(P.straw, 0.34);
        this.body(
          P.indigo,
          cone(0.33, 0.29, 10),
          pieceMatrix([0, 0, 0.62], [0, 0, 0], [1, 1, 0.32]),
        );
        break;
      case 'campesino':
        this.hat(P.straw, 0.3);
        break;
      case 'vecino':
        this.body(P.ochre, cone(0.32, 0.29, 10), pieceMatrix([0, 0, 0.62], [0, 0, 0], [1, 1, 0.3]));
        break;
      case 'cria':
        this.scarf(P.wool);
        break;
      case 'ninguna':
        break;
    }
  }

  /** Un abrigo largo con franjas de dibujo. */
  private coat(color: string, pattern: string, open: number): void {
    const bands = 5;
    for (let k = 0; k < bands; k++) {
      const z0 = 0.2 + (k * 0.62) / bands;
      const r = 0.36 - k * 0.012;
      this.body(
        k % 2 === 0 ? color : pattern,
        cone(r, r - 0.012, 12),
        pieceMatrix([0, -open * 0.1, z0 + 0.062], [0, 0, 0], [1, 1, 0.124]),
      );
    }
    for (const x of [-1, 1]) {
      this.body(color, cylinder(1, 6), limb([x * 0.27, 0.02, 0.76], [x * 0.32, 0.07, 0.52], 0.07));
    }
  }

  private scarf(color: string): void {
    this.body(
      color,
      torus(0.22, 0.055, 14, 5),
      pieceMatrix([0, 0.02, 0.86], [Math.PI / 2, 0, 0], [1, 1, 0.9]),
    );
    this.body(color, box(), pieceMatrix([0.12, 0.2, 0.68], [0.2, 0.1, 0.15], [0.1, 0.04, 0.3]));
  }

  /** Gafas redondas de latón: en los ojos, o subidas a la frente. */
  private goggles(up: boolean): void {
    const z = up ? 1.22 : 1.07;
    const y = up ? 0.2 : 0.285;
    for (const x of [-0.11, 0.11]) {
      this.body(P.brass, torus(0.075, 0.014, 16, 4), pieceMatrix([x, y, z], [up ? 0.5 : 0, 0, 0]));
      this.body(
        P.lens,
        cylinder(0.068, 12),
        pieceMatrix([x, y - 0.005, z], [Math.PI / 2 + (up ? 0.5 : 0), 0, 0], [1, 1, 0.01]),
      );
    }
    this.body(
      P.leatherDark,
      torus(0.3, 0.015, 20, 4),
      pieceMatrix([0, 0.01, z], [up ? 0.5 : 0, 0, 0]),
    );
  }

  private satchel(): void {
    this.body(P.leather, box(), pieceMatrix([0.33, -0.02, 0.4], [0, 0, 0.1], [0.08, 0.24, 0.2]));
    this.body(
      P.leatherDark,
      box(),
      pieceMatrix([0.34, -0.02, 0.5], [0, 0, 0.1], [0.085, 0.25, 0.04]),
    );
    this.body(
      P.leatherDark,
      torus(0.42, 0.012, 20, 3),
      pieceMatrix([0.05, 0, 0.62], [0, 0.7, 0], [1, 0.75, 1]),
    );
  }

  private hat(color: string, brim: number): void {
    this.body(color, cylinder(brim, 14), pieceMatrix([0, 0, 1.27], [0, 0, 0], [1, 1, 0.02]));
    this.body(color, cone(0.2, 0.05, 10), pieceMatrix([0, 0, 1.36], [0, 0, 0], [1, 1, 0.18]));
  }

  private cap(color: string): void {
    this.body(color, ball(1, 1), pieceMatrix([0, 0, 1.24], [0, 0, 0], [0.26, 0.25, 0.1]));
    this.body(color, box(), pieceMatrix([0, 0.24, 1.23], [-0.2, 0, 0], [0.22, 0.14, 0.02]));
  }

  private holding(): void {
    const right: Triple = [0.33, 0.12, 0.46];
    switch (this.spec.holding ?? 'nada') {
      case 'libro':
        // Abierto delante, con las dos manos.
        for (const side of [-1, 1]) {
          this.body(
            P.leatherDark,
            box(),
            pieceMatrix([side * 0.09, 0.3, 0.55], [0.55, side * 0.25, 0], [0.18, 0.02, 0.24]),
          );
          this.body(
            P.page,
            box(),
            pieceMatrix([side * 0.085, 0.29, 0.56], [0.55, side * 0.25, 0], [0.16, 0.015, 0.22]),
          );
        }
        break;
      case 'cesta':
        this.body(
          P.straw,
          cylinder(0.13, 10),
          pieceMatrix([right[0] + 0.05, right[1], right[2] - 0.12], [0, 0, 0], [1, 1, 0.14]),
        );
        this.body(
          P.wood,
          torus(0.12, 0.012, 12, 3),
          pieceMatrix([right[0] + 0.05, right[1], right[2] - 0.02], [0, 0, Math.PI / 2]),
        );
        break;
      case 'herramienta':
        this.body(
          '#7d8790',
          cylinder(1, 5),
          limb(right, [right[0] + 0.02, right[1] + 0.12, right[2] + 0.18], 0.02),
        );
        this.body(
          '#7d8790',
          torus(0.035, 0.012, 8, 3),
          pieceMatrix([right[0] + 0.02, right[1] + 0.13, right[2] + 0.21]),
        );
        break;
      case 'ovillo':
        this.body(P.wool, ball(0.08, 1), pieceMatrix([0, 0.3, 0.52]));
        break;
      case 'cana':
        this.body(
          P.wood,
          cylinder(1, 4),
          limb(right, [right[0] + 0.3, right[1] + 1.1, right[2] + 1.0], 0.015),
        );
        break;
      case 'nada':
        break;
    }
  }
}

export interface OolMaterials {
  /** El del cuerpo y la ropa: colores por vértice (con la luz de cielo del mundo). */
  body: Material;
}

/** Un Ool listo para colgar de un marco de lugar (ver OOL_UPRIGHT). Su altura sigue la edad. */
export function buildOol(spec: OolSpec, materials: OolMaterials): Group {
  const look = oolLook(spec.age);
  const model = new OolModel(spec, look);
  model.build();
  const group = new Group();
  group.name = `OOL_${spec.id}`;
  const shape = (parts: BufferGeometry[]): BufferGeometry =>
    mergeGeometries(parts).applyMatrix4(DESIGN_TO_OOL).scale(look.size, look.size, look.size);
  const body = new Mesh(shape(model.set.parts.stone), materials.body);
  body.name = `hogar_ool_${spec.id}`;
  body.castShadow = true;
  body.receiveShadow = true;
  const glow = new Mesh(
    shape(model.set.parts.light),
    new MeshStandardMaterial({
      vertexColors: true,
      emissive: look.glow,
      emissiveIntensity: look.glowIntensity,
      roughness: 0.6,
    }),
  );
  glow.name = `OOL_${spec.id}_Luz`;
  group.add(body, glow);
  group.userData.age = spec.age;
  return group;
}

/**
 * La forma de un Ool en una sola pieza, sin su luz aparte (para las estatuas: se pinta de un color con PieceSet).
 * Marco de diseño: Z arriba, frente hacia +Y, los pies en z = 0.
 */
export function oolShape(spec: OolSpec): BufferGeometry {
  const look = oolLook(spec.age);
  const model = new OolModel(spec, look);
  model.build();
  return mergeGeometries([...model.set.parts.stone, ...model.set.parts.light]).scale(
    look.size,
    look.size,
    look.size,
  );
}

/** Altura de un Ool de esa edad (m), para colocar lo que mira o lo que lleva. */
export function oolHeight(age: OolAge): number {
  return 1.32 * oolLook(age).size;
}
