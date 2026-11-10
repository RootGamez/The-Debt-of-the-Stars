// El Taller, la fábrica sin gente (CONTEXTO_PLANETAS.md §5), rehecho por código como gigante de gas (Fase 11F; ✅ la
// idea, Anthony 2026-11-03). Sustituye a taller.glb con el mismo contrato (raíz con radio, gravedad y reloj, y ahora
// la capa de gas que mata; mallas COL_; marcas SPAWN_, INT_, ANIM_ y EVT_): un gigante de nubes sin suelo y cinco
// islas de roca que flotan sobre él con los lugares de siempre. A las 7:00, con la secuencia de la fábrica, unos
// puentes de luz las unen (EVT_ y COL_ con `event`). El anillo de la Pista (PASO_ con `cerradura`) lleva a la Sala
// del Centro, en el núcleo del gigante; ver game/teleporter.ts. Las medidas están en tallerShape.ts.
import {
  BackSide,
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
  type ShaderMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ATMOSPHERES } from '../../data/atmospheres';
import { gasGiantMesh } from '../../render/gasGiant';
import { TELEPORTER } from '../../game/teleporter';
import { cloudLayer } from './clouds';
import {
  applySkyLight,
  ball,
  box,
  colliderMesh,
  cone,
  cylinder,
  direction,
  frameAt,
  marker,
  pieceMatrix,
  piecesToMeshes,
  PieceSet,
  torus,
  torusArc,
  type Frame,
  type MarkerProps,
  type PieceKind,
  type Triple,
} from './kit';
import { seededRandom, type Random } from './noise';
import { buildBalance } from './benchBuilders';
import { followSun, sunInWorld } from './sun';
import {
  BRIDGE_EVENT,
  BRIDGE_WIDTH,
  CORE_RADIUS,
  GAS_LETHAL_RADIUS,
  GAS_SAFE_RADIUS,
  GIANT_RADIUS,
  ISLANDS,
  SHELL_RADIUS,
  TALLER_ID,
  islandOf,
  type IslandId,
  type IslandSpec,
} from './tallerShape';

const P = {
  rock: '#6e6259',
  rockDark: '#4f463f',
  top: '#857a70',
  deck: '#8c949c',
  metal: '#7d8790',
  dark: '#3d4248',
  wall: '#a49a8c',
  roof: '#5c6670',
  amber: '#ffcf7a',
  bridge: '#9fe6ff',
  screen: '#7fe0c0',
  core: '#5a4e5e',
  shell: '#231c29',
  carve: '#d9a8ff',
} as const;

/** Las piezas que giran (ANIM_) tienen su Y local hacia arriba, como en glTF. */
const Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

interface PendingMarker {
  name: string;
  frame: Frame;
  at: Triple;
  props?: MarkerProps;
}

/** El suelo plano de una isla: su cara de arriba, a `top` del centro. */
const flat = (top: number) => ({ radius: top, groundRadius: () => top });

class TallerBuilder {
  readonly pieces = new PieceSet(31);
  /** Las luces de la secuencia de las 7:00 (EVT_). */
  readonly lights = new PieceSet(32);
  /** Los puentes de luz (EVT_ y su colisión con evento). */
  readonly bridges = new PieceSet(33);
  readonly markers: PendingMarker[] = [];
  /** Las piezas que giran (ANIM_) y lo demás que va suelto. */
  readonly extras: Object3D[] = [];
  private readonly random: Random = seededRandom(34);
  private readonly frames = new Map<IslandId, Frame>();

  constructor(private readonly materials: Record<PieceKind, Material>) {}

  frame(id: IslandId): Frame {
    let f = this.frames.get(id);
    if (!f) {
      const island = islandOf(id);
      f = frameAt(flat(island.top), island.lat, island.lon, { heading: island.heading });
      this.frames.set(id, f);
    }
    return f;
  }

  mark(name: string, frame: Frame, at: Triple, props?: MarkerProps): void {
    this.markers.push(props ? { name, frame, at, props } : { name, frame, at });
  }

  /** Una pieza que gira sobre su vertical, con sus propias mallas. */
  spinning(
    name: string,
    frame: Frame,
    at: Triple,
    props: MarkerProps,
    build: (set: PieceSet) => void,
  ): void {
    const set = new PieceSet(this.extras.length + 40);
    build(set);
    const group = new Group();
    group.name = name;
    group.position.copy(frame.point(at));
    group.quaternion.copy(frame.rotation().multiply(Y_UP));
    Object.assign(group.userData, props);
    group.add(...piecesToMeshes(set, this.materials, `taller_${name.slice('ANIM_'.length)}`));
    this.extras.push(group);
  }

  /** La roca de la isla: la cara plana de arriba, el cono que cuelga y unos peñascos en el borde. */
  island(spec: IslandSpec, bridgeDirs: readonly [number, number][]): void {
    const f = this.frame(spec.id);
    const v = this.pieces;
    const r = this.random;
    v.add(P.top, cylinder(spec.size, 20), f.at([0, 0, -0.6], [0, 0, 0], [1, 1, 1.2]));
    v.add(P.deck, cylinder(spec.size * 0.82, 20), f.at([0, 0, 0.03], [0, 0, 0], [1, 1, 0.06]));
    const depth = spec.size * 1.5;
    v.add(
      P.rock,
      cone(0.6, spec.size * 0.98, 11),
      f.at([0, 0, -1.2 - depth / 2], [0, 0, r()], [1, 1, depth]),
      'stone',
      { solid: false },
    );
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r() * 0.6;
      const d = spec.size * (0.35 + r() * 0.35);
      const h = spec.size * (0.5 + r() * 0.5);
      v.add(
        k % 2 ? P.rockDark : P.rock,
        cone(0.3, spec.size * (0.25 + r() * 0.2), 7),
        f.at(
          [Math.cos(a) * d, Math.sin(a) * d, -1.4 - h / 2],
          [r() * 0.3, r() * 0.3, r()],
          [1, 1, h],
        ),
        'stone',
        { solid: false },
      );
    }
    // Peñascos sueltos en el borde, lejos de donde llegan los puentes.
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2 + r() * 0.3;
      const clear = bridgeDirs.every(([x, y]) => Math.cos(a) * x + Math.sin(a) * y < 0.82);
      if (!clear) continue;
      const s = 0.45 + r() * 0.5;
      const d = spec.size - 0.9;
      v.add(
        P.rockDark,
        ball(1, 0),
        f.at([Math.cos(a) * d, Math.sin(a) * d, s * 0.4], [r(), r(), r()], [s, s * 1.2, s * 0.8]),
      );
    }
    // Escombros que giran despacio alrededor de la isla (no estorban: no chocan).
    this.spinning(
      `ANIM_${spec.id}_Escombros`,
      f,
      [0, 0, -1.5],
      { spin: 0.08 + r() * 0.06 },
      (set) => {
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2 + r();
          const d = spec.size + 4 + r() * 4;
          const s = 0.5 + r() * 1.1;
          set.add(
            k % 2 ? P.rock : P.rockDark,
            ball(1, 0),
            pieceMatrix(
              [Math.cos(a) * d, (r() - 0.5) * 5, Math.sin(a) * d],
              [r(), r(), r()],
              [s, s, s],
            ),
            'stone',
            { solid: false },
          );
        }
      },
    );
  }

  /** Dos postes a la boca de un puente, con su luz (solo se enciende con la secuencia). */
  bridgeMouth(f: Frame, x: number, y: number): void {
    const side = new Vector3(-y, x, 0).multiplyScalar(BRIDGE_WIDTH / 2 + 0.4);
    for (const s of [1, -1]) {
      const at: Triple = [x + side.x * s, y + side.y * s, 0];
      this.pieces.add(
        P.metal,
        cylinder(0.12, 6),
        f.at([at[0], at[1], 0.6], [0, 0, 0], [1, 1, 1.2]),
      );
      this.lights.add(P.bridge, ball(0.22, 1), f.at([at[0], at[1], 1.3]), 'light', { glow: 1.5 });
    }
  }

  /** El puente de luz entre dos islas: tramos cortos que siguen la curva del gigante de un borde al otro. */
  bridge(a: IslandSpec, b: IslandSpec): void {
    const [ax, ay] = this.towards(a, b);
    const [bx, by] = this.towards(b, a);
    const fa = this.frame(a.id);
    const fb = this.frame(b.id);
    const start = fa.point([ax * (a.size - 0.6), ay * (a.size - 0.6), 0]);
    const end = fb.point([bx * (b.size - 0.6), by * (b.size - 0.6), 0]);
    this.bridgeMouth(fa, ax * (a.size - 0.6), ay * (a.size - 0.6));
    this.bridgeMouth(fb, bx * (b.size - 0.6), by * (b.size - 0.6));
    const steps = Math.ceil(start.distanceTo(end) / 2.5);
    const from = start.clone().normalize();
    const to = end.clone().normalize();
    const at = (t: number): Vector3 => {
      const q = new Quaternion().setFromUnitVectors(from, to);
      const d = from.clone().applyQuaternion(new Quaternion().slerp(q, t));
      return d.multiplyScalar(start.length() + (end.length() - start.length()) * t);
    };
    for (let i = 0; i < steps; i++) {
      const p0 = at(i / steps);
      const p1 = at((i + 1) / steps);
      const along = p1.clone().sub(p0);
      const middle = p0.clone().add(p1).multiplyScalar(0.5);
      const up = middle.clone().normalize();
      const right = along.clone().cross(up).normalize();
      const top = right.clone().cross(along).normalize();
      const thickness = 0.25;
      const matrix = new Matrix4()
        .makeBasis(right, along.clone().normalize(), top)
        .setPosition(middle.addScaledVector(top, -thickness / 2))
        .multiply(
          pieceMatrix([0, 0, 0], [0, 0, 0], [BRIDGE_WIDTH, along.length() + 0.2, thickness]),
        );
      this.bridges.add(P.bridge, box(), matrix, 'light', { solid: true, glow: 1.2, vary: 0.06 });
    }
  }

  /** La dirección, en el plano de la isla `from` (X, Y del lugar), hacia el centro de `to`. */
  private towards(from: IslandSpec, to: IslandSpec): [number, number] {
    const f = this.frame(from.id);
    const target = direction(to.lat, to.lon);
    const right = new Vector3().setFromMatrixColumn(f.base, 0);
    const forward = new Vector3().setFromMatrixColumn(f.base, 1);
    const x = target.dot(right);
    const y = target.dot(forward);
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  }

  /** Las direcciones (en el plano de cada isla) de sus puentes. */
  bridgeDirections(): Map<IslandId, [number, number][]> {
    const dirs = new Map<IslandId, [number, number][]>(ISLANDS.map((i) => [i.id, []]));
    ISLANDS.forEach((island, i) => {
      const next = ISLANDS[i + 1];
      if (!next) return;
      dirs.get(island.id)?.push(this.towards(island, next));
      dirs.get(next.id)?.push(this.towards(next, island));
    });
    return dirs;
  }

  /** La Nave de Montaje: arcos de metal, cuatro brazos que giran y la maqueta del núcleo. */
  montaje(): void {
    const f = this.frame('montaje');
    const v = this.pieces;
    for (const y of [-6, -2, 2, 6]) {
      v.add(P.metal, torusArc(6.5, 0.3, 0, Math.PI, 18, 6), f.at([0, y, 0]), 'metal');
      this.lights.add(
        P.amber,
        torusArc(6.85, 0.07, 0.15, Math.PI - 0.15, 18, 4),
        f.at([0, y, 0]),
        'light',
        {
          glow: 1.6,
        },
      );
    }
    v.add(P.roof, box(), f.at([0, 0, 6.6], [0, 0, 0], [0.6, 13, 0.4]), 'metal');
    for (const s of [1, -1]) {
      v.add(P.roof, box(), f.at([s * 4.6, 0, 4.6], [0, s * 0.78, 0], [0.4, 13, 0.4]), 'metal');
    }
    v.add(P.dark, box(), f.at([0, 0, 0.45], [0, 0, 0], [2.6, 5, 0.9]), 'metal');
    v.add(P.metal, box(), f.at([0, 0, 1.0], [0, 0, 0], [1.8, 3.4, 0.2]), 'metal');
    // Los cuatro brazos: el poste fijo y, encima, el brazo que gira (ANIM_ del .glb de antes).
    const arms: [number, number, number][] = [
      [7.5, -3, -0.4],
      [7.5, 3, 0.5],
      [-7.5, -3, -0.4],
      [-7.5, 3, 0.5],
    ];
    arms.forEach(([x, y, spin], i) => {
      v.add(P.metal, cylinder(0.35, 8), f.at([x, y, 2.6], [0, 0, 0], [1, 1, 5.2]), 'metal');
      this.spinning(`ANIM_brazo_${String(i)}`, f, [x, y, 5.4], { spin }, (set) => {
        set.add(P.dark, ball(0.5, 1), pieceMatrix(), 'metal');
        set.add(P.metal, box(), pieceMatrix([2.6, 0, 0], [0, 0, 0], [5.2, 0.45, 0.45]), 'metal');
        set.add(P.dark, box(), pieceMatrix([5.2, -0.6, 0], [0, 0, 0], [0.3, 1.2, 0.3]), 'metal');
      });
    });
    // La maqueta del núcleo: gira deprisa solo durante la secuencia.
    v.add(P.dark, cylinder(0.7, 10), f.at([0, 9.5, 0.6], [0, 0, 0], [1, 1, 1.2]), 'metal');
    this.lights.add(
      P.amber,
      torus(0.85, 0.06, 20, 4),
      f.at([0, 9.5, 1.25], [Math.PI / 2, 0, 0]),
      'light',
      {
        glow: 1.8,
      },
    );
    this.spinning(
      'ANIM_maqueta_nucleo',
      f,
      [0, 9.5, 2.1],
      { spin: 1.6, event: BRIDGE_EVENT },
      (set) => {
        set.add(P.metal, ball(0.55, 1), pieceMatrix(), 'metal');
        set.add(P.amber, torus(0.95, 0.05, 24, 4), pieceMatrix(), 'light', { glow: 1.4 });
        set.add(P.deck, torus(0.8, 0.05, 24, 4), pieceMatrix([0, 0, 0], [0.7, 0, 0]), 'metal');
      },
    );
    v.add(P.dark, box(), f.at([3.2, -8.5, 0.5], [0, 0, 0.3], [1.4, 0.8, 1.0]), 'metal');
    v.add(P.screen, box(), f.at([3.2, -8.5, 1.05], [0.5, 0, 0.3], [1.1, 0.5, 0.05]), 'light');
    this.mark('INT_montaje', f, [3.2, -8.5, 1.2], {
      clue_id: 'taller.montaje',
      kind: 'observacion',
    });
    this.mark('INT_secuencia', f, [1.5, 9.5, 1.2], {
      clue_id: 'taller.secuencia',
      kind: 'observacion',
    });
    this.mark('SPAWN_Montaje', f, [0, -12, 0.3]);
  }

  /** La Cuna vacía: el anillo donde se montó el Contrapeso, la nota y el manual. */
  cuna(): void {
    const f = this.frame('cuna');
    const v = this.pieces;
    v.add(P.dark, box(), f.at([0, 0, 0.4], [0, 0, 0], [5.2, 2.2, 0.8]), 'metal');
    for (const x of [-2.3, 2.3]) {
      v.add(P.metal, box(), f.at([x, 0, 1.6], [0, 0, 0], [0.4, 0.6, 1.8]), 'metal');
    }
    v.add(P.metal, torus(2.0, 0.22, 28, 6), f.at([0, 0, 3.0]), 'metal', { solid: false });
    this.lights.add(P.amber, torus(1.7, 0.05, 28, 4), f.at([0, 0, 3.0]), 'light', { glow: 1.6 });
    v.add(P.wall, box(), f.at([3.4, -2.6, 0.4], [0, 0, 0.4], [0.8, 0.8, 0.8]));
    v.add(P.metal, cylinder(0.1, 6), f.at([-3.6, -3, 0.5], [0, 0, 0], [1, 1, 1.0]), 'metal');
    v.add(P.dark, box(), f.at([-3.6, -3, 1.05], [0.5, 0, 0], [0.9, 0.6, 0.06]), 'metal');
    this.mark('INT_cuna', f, [0, -1.6, 1.2], { clue_id: 'taller.cuna', kind: 'objeto' });
    this.mark('INT_nota_cuna', f, [3.4, -2.6, 1.0], { clue_id: 'taller.nota_cuna', kind: 'texto' });
    this.mark('INT_manual', f, [-3.6, -3, 1.2], { clue_id: 'taller.manual', kind: 'texto' });
    // La Balanza del Contrapeso (P6): su viga, la maqueta y las pesas las dibuja render/benchView.ts.
    buildBalance(
      v,
      f,
      (name, frame, at, props) => {
        this.mark(name, frame, at, props);
      },
      { post: P.metal, base: P.dark, accent: P.amber, plate: P.wall, hole: P.dark },
    );
  }

  /** Los Dormitorios: tres cabinas y, fuera, las camas de los gemelos bajo un toldo. */
  dormitorios(): void {
    const f = this.frame('dormitorios');
    const v = this.pieces;
    for (const x of [-5.5, 0, 5.5]) {
      v.add(P.wall, box(), f.at([x, 4, 1.3], [0, 0, 0], [3.6, 3, 2.6]));
      v.add(P.roof, box(), f.at([x, 4, 2.75], [0, 0, 0], [4, 3.4, 0.3]), 'metal');
      v.add(P.dark, box(), f.at([x, 2.48, 1.0], [0, 0, 0], [1.0, 0.06, 2.0]), 'metal', {
        solid: false,
      });
      this.lights.add(P.amber, box(), f.at([x, 2.45, 2.3], [0, 0, 0], [0.5, 0.05, 0.2]), 'light', {
        glow: 1.5,
      });
    }
    for (const x of [-1.3, 1.3]) {
      v.add(P.deck, box(), f.at([x, -4, 0.25], [0, 0, 0], [1.0, 2.2, 0.5]), 'metal');
    }
    v.add(P.dark, box(), f.at([0, -4, 0.35], [0, 0, 0], [0.6, 0.6, 0.7]), 'metal');
    for (const [x, y] of [
      [-2.4, -2.6],
      [2.4, -2.6],
      [-2.4, -5.4],
      [2.4, -5.4],
    ] as const) {
      v.add(P.metal, cylinder(0.08, 6), f.at([x, y, 1.3], [0, 0, 0], [1, 1, 2.6]), 'metal');
    }
    v.add(P.roof, box(), f.at([0, -4, 2.65], [0, 0, 0], [5.2, 3.2, 0.1]), 'metal', {
      solid: false,
    });
    this.mark('INT_dormitorios', f, [0, 1.6, 1.2], {
      clue_id: 'taller.dormitorios',
      kind: 'texto',
    });
    this.mark('INT_gemelos', f, [0, -4, 1.0], { clue_id: 'taller.gemelos', kind: 'texto' });
  }

  /** La Cabina de Control: una garita abierta por delante con tres consolas. */
  cabina(): void {
    const f = this.frame('cabina');
    const v = this.pieces;
    v.add(P.wall, box(), f.at([0, 3.2, 1.6], [0, 0, 0], [7.4, 0.4, 3.2]));
    for (const x of [-3.5, 3.5])
      v.add(P.wall, box(), f.at([x, 1.6, 1.6], [0, 0, 0], [0.4, 3.6, 3.2]));
    v.add(P.roof, box(), f.at([0, 1.6, 3.35], [0, 0, 0], [7.8, 4, 0.3]), 'metal');
    for (const x of [-2, 0, 2]) {
      v.add(P.dark, box(), f.at([x, 2.3, 0.5], [0, 0, 0], [1.4, 0.8, 1.0]), 'metal');
      v.add(P.screen, box(), f.at([x, 2.1, 1.08], [-0.5, 0, 0], [1.1, 0.5, 0.05]), 'light');
    }
    v.add(
      P.metal,
      cylinder(1.0, 16),
      f.at([0, 3.45, 2.2], [Math.PI / 2, 0, 0], [1, 1, 0.1]),
      'metal',
      {
        solid: false,
      },
    );
    this.mark('INT_cabina', f, [0, 1.5, 1.2], { clue_id: 'taller.cabina', kind: 'observacion' });
  }

  /** La Pista de Pruebas: un anillo de vía partido alrededor de la isla, el reloj y el teletransportador. */
  pista(): void {
    const spec = islandOf('pista');
    const f = this.frame('pista');
    const v = this.pieces;
    const r = this.random;
    for (let k = 0; k < 7; k++) {
      const from = (k / 7) * Math.PI * 2 + r() * 0.2;
      v.add(
        P.metal,
        torusArc(spec.size + 2.5, 0.35, from, from + 0.6, 8, 5),
        f.at(
          [0, 0, -0.4 + (r() - 0.5) * 1.5],
          [Math.PI / 2 + (r() - 0.5) * 0.15, (r() - 0.5) * 0.15, 0],
        ),
        'metal',
        { solid: false },
      );
    }
    // El anillo del teletransportador: sus dos postes, el aro y el velo de luz (solo cuando se abre).
    for (const x of [-2.1, 2.1])
      v.add(P.dark, box(), f.at([x, -4, 1.7], [0, 0, 0], [0.5, 0.5, 3.4]), 'metal');
    v.add(P.metal, torus(1.6, 0.18, 28, 6), f.at([0, -4, 1.75]), 'metal', { solid: false });
    this.lights.add(P.bridge, torus(1.38, 0.05, 28, 4), f.at([0, -4, 1.75]), 'light', {
      glow: 1.8,
    });
    this.extras.push(portal(TELEPORTER.portal, f.at([0, -4, 1.75]), false));
    this.mark('PASO_Pista', f, [0, -4, 0], { destino: 'PASO_Centro', cerradura: TELEPORTER.lock });
    // El reloj de la Pista: un poste con su esfera.
    v.add(P.metal, cylinder(0.12, 6), f.at([3.6, -6.5, 0.6], [0, 0, 0], [1, 1, 1.2]), 'metal');
    v.add(
      P.deck,
      cylinder(0.6, 16),
      f.at([3.6, -6.5, 1.55], [Math.PI / 2, 0, 0], [1, 1, 0.08]),
      'metal',
      {
        solid: false,
      },
    );
    for (const y of [-6.56, -6.44]) {
      v.add(
        P.screen,
        cylinder(0.45, 16),
        f.at([3.6, y, 1.55], [Math.PI / 2, 0, 0], [1, 1, 0.02]),
        'light',
      );
    }
    this.mark('INT_pista', f, [3.6, -6.5, 1.2], {
      clue_id: TELEPORTER.source,
      kind: 'observacion',
    });
    this.mark('SPAWN_Prueba', f, [-4, 4, 0.3]);
  }

  /** La Sala del Centro: el núcleo de roca, la cáscara oscura con las indicaciones y el anillo de vuelta. */
  centro(): void {
    const v = this.pieces;
    v.add(P.core, ball(CORE_RADIUS, 3), new Matrix4());
    const core = { radius: CORE_RADIUS, groundRadius: () => CORE_RADIUS };
    const gate = frameAt(core, 70, 0, { heading: 180 });
    for (const x of [-2.1, 2.1])
      v.add(P.dark, box(), gate.at([x, 0, 1.7], [0, 0, 0], [0.5, 0.5, 3.6]), 'metal');
    v.add(P.metal, torus(1.6, 0.18, 28, 6), gate.at([0, 0, 1.75]), 'metal', { solid: false });
    this.extras.push(portal('Taller_Portal_Centro', gate.at([0, 0, 1.75]), true));
    this.mark('PASO_Centro', gate, [0, 0, 0], { destino: 'PASO_Pista' });
    // Las páginas que faltan, en un atril al otro lado del anillo.
    const lectern = frameAt(core, 35, 0, { heading: 0 });
    v.add(P.metal, cylinder(0.12, 6), lectern.at([0, 0, 0.5], [0, 0, 0], [1, 1, 1.2]), 'metal');
    v.add(P.wall, box(), lectern.at([0, 0, 1.12], [0.5, 0, 0], [0.8, 0.55, 0.06]), 'stone', {
      solid: false,
    });
    v.add(P.carve, ball(0.12, 1), lectern.at([0, 0, 1.5]), 'light', { glow: 1.4 });
    this.mark('INT_paginas', lectern, [0, 0, 1.2], { clue_id: 'taller.paginas', kind: 'texto' });
    for (let k = 0; k < 9; k++) {
      const crystal = frameAt(core, -40 + k * 13, k * 47, { heading: k * 40 });
      v.add(
        P.carve,
        cone(0.25, 0, 5),
        crystal.at([0, 0, 0.5], [0.2, 0.1, 0], [1, 1, 1.2]),
        'light',
        {
          glow: 0.9,
        },
      );
    }
  }
}

/** El velo de luz que llena un anillo de teletransporte. */
function portal(name: string, matrix: Matrix4, visible: boolean): Mesh {
  const mesh = new Mesh(
    cylinder(1.4, 24)
      .clone()
      .applyMatrix4(pieceMatrix([0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 0.02])),
    new MeshBasicMaterial({
      color: new Color(P.bridge).multiplyScalar(1.3),
      transparent: true,
      opacity: 0.55,
      side: DoubleSide,
      depthWrite: false,
    }),
  );
  mesh.name = name;
  mesh.applyMatrix4(matrix);
  mesh.visible = visible;
  return mesh;
}

/** La cáscara oscura de la Sala del Centro, por dentro, con las indicaciones talladas que brillan. */
function shell(): Group {
  const group = new Group();
  group.name = 'Taller_Sala';
  const wall = new Mesh(
    new SphereGeometry(SHELL_RADIUS, 32, 16),
    new MeshStandardMaterial({ color: P.shell, roughness: 1, side: BackSide, flatShading: true }),
  );
  wall.name = 'Taller_Sala_Cascara';
  const carvings = new PieceSet(35);
  const random = seededRandom(36);
  for (const [x, y] of [
    [0, 0],
    [Math.PI / 2, 0],
    [0.6, 1.1],
  ] as const) {
    carvings.add(
      P.carve,
      torus(SHELL_RADIUS - 0.3, 0.06, 64, 3),
      pieceMatrix([0, 0, 0], [x, y, 0]),
      'light',
      {
        glow: 1.2,
      },
    );
  }
  for (let k = 0; k < 14; k++) {
    const f = frameAt(
      { radius: SHELL_RADIUS - 0.4, groundRadius: () => SHELL_RADIUS - 0.4 },
      -20 + random() * 50,
      k * (360 / 14),
      { heading: 0 },
    );
    for (let line = 0; line < 3; line++) {
      const length = 0.8 + random() * 1.8;
      carvings.add(
        P.carve,
        box(),
        f.at([0, line * 0.5 - 0.5, 0], [0, 0, 0], [length, 0.12, 0.05]),
        'light',
        {
          glow: 1.1,
        },
      );
    }
  }
  const lines = new Mesh(
    mergeGeometries(carvings.parts.light),
    new MeshBasicMaterial({ vertexColors: true }),
  );
  lines.name = 'Taller_Sala_Indicaciones';
  group.add(wall, lines);
  return group;
}

export interface TallerOptions {
  /** Para tests: sin el gigante ni las nubes (shaders). */
  sky?: boolean;
}

export function buildTaller({ sky = true }: TallerOptions = {}): Group {
  const sun = sunInWorld(TALLER_ID);
  const air = ATMOSPHERES[TALLER_ID];
  const light = {
    day: new Color('#c9b8a4').multiplyScalar(1.4),
    ground: new Color('#d08a52').multiplyScalar(1.1),
    night: new Color(0.06, 0.06, 0.1),
    // Bruma cálida de gas (🟡): lo lejano se vuelve crema de día y azul oscuro de noche.
    haze: {
      day: new Color('#e3c6a2'),
      night: new Color('#151726'),
      density: 0.003,
      max: 0.3,
      radius: ISLANDS.reduce((low, i) => Math.min(low, i.top), Infinity),
    },
  };
  const lit = (
    options: ConstructorParameters<typeof MeshStandardMaterial>[0],
  ): MeshStandardMaterial => {
    const material = new MeshStandardMaterial({ flatShading: true, ...options });
    applySkyLight(material, sun, light);
    return material;
  };
  const materials: Record<PieceKind, Material> = {
    stone: lit({ vertexColors: true, roughness: 0.92 }),
    metal: lit({ vertexColors: true, roughness: 0.45, metalness: 0.5 }),
    light: new MeshBasicMaterial({ vertexColors: true }),
  };
  const builder = new TallerBuilder(materials);
  const dirs = builder.bridgeDirections();
  for (const island of ISLANDS) builder.island(island, dirs.get(island.id) ?? []);
  builder.montaje();
  builder.cuna();
  builder.dormitorios();
  builder.cabina();
  builder.pista();
  builder.centro();
  ISLANDS.forEach((island, i) => {
    const next = ISLANDS[i + 1];
    if (next) builder.bridge(island, next);
  });

  const frame = new Group();
  frame.name = 'taller_Marco';
  frame.rotation.x = -Math.PI / 2;
  frame.add(...piecesToMeshes(builder.pieces, materials, 'taller'));
  frame.add(colliderMesh('COL_taller_Islas', builder.pieces.colliders));
  // Las luces de la secuencia y los puentes: EVT_, el juego los enseña solo durante las 7:00.
  const lights = new Mesh(mergeGeometries(builder.lights.parts.light), materials.light);
  lights.name = 'EVT_secuencia_fabrica_Luces';
  lights.userData.event = BRIDGE_EVENT;
  const bridges = new Mesh(
    mergeGeometries(builder.bridges.parts.light),
    new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  );
  bridges.name = 'EVT_Taller_Puentes';
  bridges.userData.event = BRIDGE_EVENT;
  bridges.renderOrder = 3;
  const bridgeColliders = colliderMesh('COL_Taller_Puentes', builder.bridges.colliders);
  bridgeColliders.userData.event = BRIDGE_EVENT;
  frame.add(lights, bridges, bridgeColliders, shell(), ...builder.extras);
  for (const { name, frame: f, at, props } of builder.markers) {
    const rotation = name.startsWith('PASO_') ? f.rotation().multiply(Y_UP) : f.rotation();
    frame.add(marker(name, f.point(at), rotation, props));
  }

  if (sky && air) {
    // El gigante gira con el Taller: la luz de la Brasa se mueve por su marco y hay que seguirla.
    const giant = gasGiantMesh({
      name: 'taller_Gigante',
      radius: GIANT_RADIUS,
      sun,
      bands: ['#f1e6d2', '#e3a35f', '#f6d9a8', '#7fb7c4', '#d9865a'].map((c) => new Color(c)),
      night: new Color('#141522'),
      rim: new Color('#f3d2a6'),
      bandCount: 11,
      speed: 0.004,
      seed: 0.31,
    });
    const mist = cloudLayer({
      name: 'taller_Nubes',
      radius: GIANT_RADIUS + 5,
      sun,
      axis: new Vector3(0, 0, 1),
      speed: 0.012,
      cover: 0.34,
      scale: 4.2,
      day: new Color('#fff4e6'),
      night: new Color('#2a2230'),
      opacity: 0.7,
      seed: 0.2,
    });
    const mistSun = (mist.material as ShaderMaterial).uniforms.uSun?.value as Vector3 | undefined;
    followSun(giant, mistSun ? [sun, mistSun] : [sun]);
    frame.add(giant, mist);
  }

  const root = new Object3D();
  root.name = TALLER_ID;
  Object.assign(root.userData, {
    world_id: TALLER_ID,
    radius: GIANT_RADIUS,
    gravity: 0.6,
    clock_rate: 0.85,
    ambient: 1.15,
    ambient_color: '#A0AAB4',
    gas_lethal_radius: GAS_LETHAL_RADIUS,
    gas_safe_radius: GAS_SAFE_RADIUS,
  });
  root.add(frame);

  const scene = new Group();
  scene.add(root);
  scene.updateMatrixWorld(true);
  return scene;
}
