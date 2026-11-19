// Lo que comparten las partes del Laboratorio Oculto por código (Fase 11): la paleta (E7, 🟡: cálida y de taller de
// ciencia; salvia, marfil y caliza, madera y latón, revoque claro con zócalo oscuro, tejas, pizarra y cobre verdoso, y
// la luz de lámpara), el constructor con sus juegos de piezas (dentro, fuera, lo que brilla frío y el vidrio) y las
// piezas que se repiten: la plataforma de una zona, el farol, la Puerta plegada, camas, mesas, papeles y muros de
// estratos. Pasado de blender/scripts/arte_laboratorio.py.
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type Matrix4,
  type Object3D,
} from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  marker,
  pieceMatrix,
  piecesToMeshes,
  PieceSet,
  torus,
  type Frame,
  type MarkerProps,
  type PieceKind,
  type Triple,
} from './kit';

export const PALETTE = {
  green: '#7C8C80',
  greenLight: '#9CAC9E',
  grey: '#555E58',
  greyDark: '#2E3430',
  white: '#E4E2D6',
  wood: '#8A6A48',
  brass: '#A88A50',
  paper: '#EDE6D0',
  chalk: '#F4F0E4',
  board: '#2C3834',
  blanket: '#4A6A72',
  seal: '#A83A32',
  sandstone: '#B9AE96',
  sandstoneDark: '#8E8570',
  shell: '#1C1A24',
  black: '#07060A',
  amber: '#FFC070',
  fold: '#CFE6DA',
  seed: '#9FD0C0',
  // La cámara de frío y la mesa partida (E4, 🟡).
  frost: '#DCEAF0',
  ice: '#A9C8D6',
  iceDeep: '#6F97AA',
  woodPale: '#A78A68',
  woodDark: '#5E4630',
  dust: '#B6A893',
  // Las casas del Laboratorio (E7, 🟡): revoque, zócalo, dinteles y cubiertas.
  plaster: '#DACFB4',
  plasterShade: '#C5B697',
  plinth: '#4B5C54',
  lintel: '#B7A078',
  limestone: '#D4C7A8',
  roofTile: '#A65F3F',
  roofTileDark: '#7F4631',
  slate: '#56616C',
  verdigris: '#6EA290',
  iron: '#3B403D',
  leaf: '#7C8F4A',
  leafDry: '#A99A5C',
} as const;

/** Lo que el juego enciende o apaga de un portal caído (render/fallenGateView.ts): su membrana y la luz de su hora. */
export type FallenPart = 'membrane' | 'blink';
const P = PALETTE;

/** El suelo de una zona sube 0,15 m sobre la cara interior: así lo dejó el Laboratorio de Blender. */
export const FLOOR = 0.15;
/** Lo que gira (ANIM_) gira sobre su Y local: el Z del marco de su sitio. */
const Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

export class LabBuilder {
  /** Dentro de la cavidad (con la luz de la semilla) y fuera, sobre la cáscara (con la de la Brasa). */
  readonly inside = new PieceSet(91);
  readonly outside = new PieceSet(92);
  /** Lo que brilla frío: la membrana de las Puertas y el halo de la semilla. */
  readonly cold: BufferGeometry[] = [];
  /** El vidrio de ventanas, lucernarios y del invernadero: una sola malla transparente. */
  readonly glass: BufferGeometry[] = [];
  readonly markers: Object3D[] = [];
  /** Lo que va suelto (lo que gira, lo que el juego enciende): solo se dibuja estando en el Nudo. */
  readonly extras: Object3D[] = [];
  private readonly loose = new Map<string, MeshBasicMaterial>();

  constructor(private readonly materials: Record<PieceKind, Material>) {}

  /** Un material de luz plano para piezas sueltas, compartido por color. */
  private glowMaterial(color: string, glow: number, transparent = false): MeshBasicMaterial {
    const key = `${color}-${String(glow)}-${String(transparent)}`;
    let material = this.loose.get(key);
    if (!material) {
      material = new MeshBasicMaterial({
        color: new Color(color).multiplyScalar(glow),
        transparent,
        depthWrite: !transparent,
      });
      this.loose.set(key, material);
    }
    return material;
  }

  /**
   * Una pieza suelta con su propia malla (no se funde con las demás) para que el juego la encienda, la apague o la
   * mueva; `data` va en `userData`. Con `transparent`, su material es propio (el juego cambia su opacidad).
   */
  part(
    name: string,
    geometry: BufferGeometry,
    matrix: Matrix4,
    look: { color: string; glow?: number; transparent?: boolean },
    data: Record<string, string | number> = {},
  ): Mesh {
    const shared = this.glowMaterial(look.color, look.glow ?? 1, look.transparent);
    const mesh = new Mesh(geometry.clone(), look.transparent ? shared.clone() : shared);
    mesh.name = name;
    mesh.applyMatrix4(matrix);
    Object.assign(mesh.userData, data);
    this.extras.push(mesh);
    return mesh;
  }

  solid(set: PieceSet, color: string, geometry: BufferGeometry, matrix: Matrix4): void {
    set.add(color, geometry, matrix, 'stone', { solid: true });
  }

  view(set: PieceSet, color: string, geometry: BufferGeometry, matrix: Matrix4): void {
    set.add(color, geometry, matrix, 'stone', { solid: false });
  }

  lamp(set: PieceSet, geometry: BufferGeometry, matrix: Matrix4, color: string = P.amber): void {
    set.add(color, geometry, matrix, 'light', { glow: 1.4, vary: 0 });
  }

  glowCold(geometry: BufferGeometry, matrix: Matrix4): void {
    this.cold.push(geometry.clone().applyMatrix4(matrix));
  }

  /** Un vidrio (dentro): se ve a través y, como un vidrio de verdad, no se atraviesa. */
  pane(geometry: BufferGeometry, matrix: Matrix4): void {
    const g = geometry.clone().applyMatrix4(matrix);
    this.glass.push(g);
    this.inside.addCollider(g);
  }

  mark(name: string, f: Frame, at: Triple, props?: MarkerProps): void {
    this.markers.push(marker(name, f.point(at), f.rotation(), props));
  }

  /**
   * Una pieza que gira (ANIM_) puesta en `matrix` (su Y local es el eje de giro). Con `bubble`, gira al ritmo de
   * la burbuja del Contrapeso (E2).
   */
  spinning(
    name: string,
    position: Vector3,
    rotation: Quaternion,
    spin: number,
    build: (set: PieceSet) => void,
    bubble = false,
  ): void {
    const set = new PieceSet(this.extras.length + 95);
    build(set);
    const group = new Group();
    group.name = name;
    group.position.copy(position);
    group.quaternion.copy(rotation).multiply(Y_UP);
    group.userData.spin = spin;
    if (bubble) group.userData.bubble = true;
    group.add(...piecesToMeshes(set, this.materials, `laboratorio_${name.slice('ANIM_'.length)}`));
    this.extras.push(group);
  }

  /**
   * La plataforma de una zona de la cara interior: una losa de caliza con su canto de latón y las doce horas de un
   * reloj en el borde (la de arriba, más larga).
   */
  platform(f: Frame, width: number, depth: number): void {
    this.solid(
      this.inside,
      P.limestone,
      box(),
      f.at([0, 0, FLOOR - 1.2], undefined, [width, depth, 2.4]),
    );
    for (const [x, y, w, d] of [
      [0, depth / 2, width + 0.02, 0.05],
      [0, -depth / 2, width + 0.02, 0.05],
      [width / 2, 0, 0.05, depth + 0.02],
      [-width / 2, 0, 0.05, depth + 0.02],
    ] as const) {
      this.view(this.inside, P.brass, box(), f.at([x, y, FLOOR - 0.02], undefined, [w, d, 0.06]));
    }
    for (let k = 0; k < 12; k++) {
      const a = (2 * Math.PI * k) / 12;
      const x = Math.cos(a) * (width / 2 - 0.25);
      const y = Math.sin(a) * (depth / 2 - 0.25);
      const long = k % 3 === 0 ? 0.36 : 0.2;
      this.view(
        this.inside,
        k % 3 === 0 ? P.brass : P.plasterShade,
        box(),
        f.at([x, y, FLOOR + 0.006], [0, 0, a], [long, 0.05, 0.012]),
      );
    }
  }

  /** Un farol: poste, brazo y capuchón de latón y la luz. */
  lantern(set: PieceSet, f: Frame, x: number, y: number, z = FLOOR, height = 2.4): void {
    this.solid(
      set,
      P.greyDark,
      cylinder(0.06, 4),
      f.at([x, y, z + height / 2], undefined, [1, 1, height]),
    );
    this.view(set, P.brass, box(), f.at([x, y + 0.22, z + height], undefined, [0.06, 0.5, 0.06]));
    this.view(
      set,
      P.brass,
      cone(0.2, 0.06, 4),
      f.at([x, y + 0.45, z + height - 0.08], undefined, [1, 1, 0.18]),
    );
    this.lamp(set, ball(0.1, 0), f.at([x, y + 0.45, z + height - 0.2]));
  }

  /**
   * El anillo de una Puerta plegada, de pie y mirando a +Y, con su membrana pálida y dos pilares. Con `fallen` (un
   * portal que apagó la huida, E4) la membrana y la hora ámbar van sueltas: el juego las apaga mientras está caído
   * (anillo muerto, hora que parpadea) y las enciende al ponerlo en hora.
   */
  gate(set: PieceSet, f: Frame, z: number, fallen?: { lock: string; name: string }): void {
    const centre = z + 1.55;
    this.view(set, P.sandstone, torus(1.75, 0.2, 24, 4), f.at([0, 0, centre]));
    this.view(set, P.board, torus(1.95, 0.08, 24, 4), f.at([0, -0.05, centre]));
    const tag = (part: FallenPart): Record<string, string> =>
      fallen ? { fallen_lock: fallen.lock, fallen_part: part } : {};
    // Las horas de un reloj de doce en el anillo; la última, en ámbar.
    for (let k = 0; k < 12; k++) {
      const a = Math.PI / 2 - (2 * Math.PI * k) / 12;
      const m = f.at(
        [Math.cos(a) * 1.75, 0.22, centre + Math.sin(a) * 1.75],
        [0, Math.PI / 2 - a, 0],
        [0.08, 0.05, 0.28],
      );
      if (k === 0 && fallen) {
        this.view(set, P.board, box(), m);
        this.part(
          `laboratorio_${fallen.name}_Hora`,
          box(),
          m,
          { color: P.amber, glow: 1.4 },
          tag('blink'),
        );
      } else if (k === 0) this.lamp(set, box(), m);
      else this.view(set, P.board, box(), m);
    }
    const membrane = f.at([0, 0, centre], [Math.PI / 2, 0, 0], [1, 1, 0.02]);
    if (fallen) {
      const look = { color: P.fold, glow: 1.15 };
      this.part(
        `laboratorio_${fallen.name}_Membrana`,
        cylinder(1.52, 20),
        membrane,
        look,
        tag('membrane'),
      );
    } else this.glowCold(cylinder(1.52, 20), membrane);
    for (const x of [-2.05, 2.05]) {
      this.solid(set, P.sandstoneDark, box(), f.at([x, 0, z + 0.9], undefined, [0.4, 0.5, 1.8]));
      this.view(set, P.brass, box(), f.at([x, 0, z + 1.85], undefined, [0.48, 0.58, 0.1]));
    }
  }

  bed(f: Frame, x: number, y: number, used: boolean): void {
    const s = this.inside;
    this.solid(s, P.grey, box(), f.at([x, y, FLOOR + 0.22], undefined, [1.0, 2.1, 0.34]));
    this.view(s, P.white, box(), f.at([x, y, FLOOR + 0.46], undefined, [0.94, 2.0, 0.14]));
    this.view(s, P.white, box(), f.at([x, y + 0.8, FLOOR + 0.58], undefined, [0.6, 0.35, 0.12]));
    if (used) {
      // Manta revuelta, almohada torcida y la huella en el colchón.
      this.view(
        s,
        P.blanket,
        box(),
        f.at([x + 0.18, y - 0.15, FLOOR + 0.58], [0, 0.08, 0.18], [0.8, 1.2, 0.1]),
      );
      this.view(
        s,
        P.blanket,
        box(),
        f.at([x - 0.38, y - 1.0, FLOOR + 0.4], [0.1, 0, 0.3], [0.4, 0.5, 0.3]),
      );
      this.view(s, P.green, box(), f.at([x, y + 0.1, FLOOR + 0.54], undefined, [0.5, 0.9, 0.04]));
    } else {
      this.view(
        s,
        P.blanket,
        box(),
        f.at([x, y - 0.75, FLOOR + 0.56], undefined, [0.9, 0.45, 0.1]),
      );
    }
  }

  table(f: Frame, x: number, y: number, width = 2.2, depth = 0.9, turn = 0): void {
    const s = this.inside;
    this.solid(s, P.wood, box(), f.at([x, y, FLOOR + 0.78], [0, 0, turn], [width, depth, 0.08]));
    const c = Math.cos(turn);
    const n = Math.sin(turn);
    for (const dx of [-width / 2 + 0.1, width / 2 - 0.1]) {
      for (const dy of [-depth / 2 + 0.1, depth / 2 - 0.1]) {
        this.solid(
          s,
          P.grey,
          box(),
          f.at(
            [x + dx * c - dy * n, y + dx * n + dy * c, FLOOR + 0.37],
            [0, 0, turn],
            [0.08, 0.08, 0.74],
          ),
        );
      }
    }
  }

  papers(f: Frame, x: number, y: number, z: number, count = 4, turn = 0): void {
    for (let k = 0; k < count; k++) {
      this.view(
        this.inside,
        P.paper,
        box(),
        f.at(
          [x + 0.12 * (k % 2) - 0.06, y + 0.08 * k, z + 0.012 * k],
          [0, 0, turn + 0.35 * k - 0.5],
          [0.34, 0.44, 0.01],
        ),
      );
    }
  }

  /** Un muro bajo en capas horizontales (los estratos de los Ausentes). */
  strata(f: Frame, x: number, y: number, width: number, height = 1.4, turn = 0): void {
    const layers = 4;
    const h = height / layers;
    for (let k = 0; k < layers; k++) {
      this.solid(
        this.inside,
        k % 2 === 0 ? P.sandstone : P.sandstoneDark,
        box(),
        f.at([x, y, FLOOR + h * (k + 0.5)], [0, 0, turn], [width - 0.06 * k, 0.4 - 0.03 * k, h]),
      );
    }
  }
}

export { pieceMatrix };
