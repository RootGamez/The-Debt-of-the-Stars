// Lo que comparten las partes de Cicatriz (Fase 11H): el constructor con sus juegos de piezas (fuera, con la luz
// del cielo; dentro, con la del núcleo), las marcas pendientes, lo que va suelto, los huecos que se abren en la roca
// para las salas de bajo tierra, y los marcos de cada sitio: por fuera (arriba hacia fuera), por dentro (arriba
// hacia el centro) y en la banda de la Sala del Motor.
import { Group, Matrix4, Quaternion, Vector3, type Material, type Object3D } from 'three';
import {
  direction,
  Frame,
  frameAt,
  piecesToMeshes,
  PieceSet,
  pieceMatrix,
  type MarkerProps,
  type PieceKind,
  type Triple,
} from './kit';
import { seededRandom, type Random } from './noise';
import {
  engineBasis,
  enginePoint,
  ENGINE_RADIUS,
  innerGroundRadius,
  INNER_RADIUS,
  OUTER_RADIUS,
  outerGroundRadius,
} from './cicatrizShape';

const DEG = Math.PI / 180;
/** Las piezas que giran (ANIM_) y los anillos PASO_ tienen su Y local hacia arriba, como en glTF. */
import { NEAR_ONLY } from '../../render/nearDetail';

export const Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

export const PALETTE = {
  rust: '#8a3a22',
  rustLight: '#a85a3a',
  black: '#1a1416',
  ash: '#5a5458',
  ashLight: '#7a7478',
  ember: '#ff7a20',
  sand: '#b8a27a',
  sandDark: '#8f7c5a',
  paper: '#e4d8c0',
  lamp: '#ffb070',
  slate: '#3f444c',
  slateLight: '#6a707a',
  bone: '#d8ccb4',
  violet: '#b08cff',
  glass: '#ffd9a0',
} as const;

export type Side = 'outside' | 'inside';

export interface PendingMarker {
  name: string;
  position: Vector3;
  rotation: Quaternion;
  props?: MarkerProps;
}

/** Un hueco en la roca de fuera: una caja (su matriz, de la caja unidad al planeta). */
export interface Carve {
  inverse: Matrix4;
}

export class CicatrizBuilder {
  /** Lo de fuera (la luz del cielo) y lo de dentro (la del núcleo). */
  readonly sets: Record<Side, PieceSet> = { outside: new PieceSet(51), inside: new PieceSet(52) };
  readonly markers: PendingMarker[] = [];
  /** Las piezas que giran (ANIM_), lo que solo se ve en un evento (EVT_) y lo demás que va suelto. */
  readonly extras: Object3D[] = [];
  readonly carves: Carve[] = [];
  readonly random: Random = seededRandom(53);

  constructor(readonly materials: Record<Side, Record<PieceKind, Material>>) {}

  get outside(): PieceSet {
    return this.sets.outside;
  }

  get inside(): PieceSet {
    return this.sets.inside;
  }

  /** Una marca en `at` del marco `frame`, girada como él. */
  mark(name: string, frame: Frame, at: Triple, props?: MarkerProps): void {
    const rotation = frame.rotation();
    if (name.startsWith('PASO_')) rotation.multiply(Y_UP);
    this.markers.push({ name, position: frame.point(at), rotation, ...(props && { props }) });
  }

  /** Abre la roca de fuera donde va una sala de bajo tierra (la caja unidad con esa matriz). */
  carve(matrix: Matrix4): void {
    this.carves.push({ inverse: matrix.clone().invert() });
  }

  /** Una pieza que gira sobre su Y local (ANIM_), con sus propias mallas. */
  spinning(
    name: string,
    matrix: Matrix4,
    props: MarkerProps,
    side: Side,
    build: (set: PieceSet) => void,
  ): Group {
    const set = new PieceSet(this.extras.length + 60);
    build(set);
    const group = new Group();
    group.name = name;
    const position = new Vector3();
    const rotation = new Quaternion();
    matrix.decompose(position, rotation, new Vector3());
    group.position.copy(position);
    group.quaternion.copy(rotation.multiply(Y_UP));
    Object.assign(group.userData, props);
    // Lo de dentro no se ve desde fuera del mundo: solo se dibuja estando en él (render/nearDetail.ts).
    if (side === 'inside') group.userData[NEAR_ONLY] = true;
    group.add(
      ...piecesToMeshes(set, this.materials[side], `cicatriz_${name.replace(/^ANIM_/, '')}`),
    );
    this.extras.push(group);
    return group;
  }
}

/** Si un punto del planeta cae dentro de algún hueco de bajo tierra. */
export function insideCarve(point: Vector3, carves: readonly Carve[]): boolean {
  const local = new Vector3();
  return carves.some(({ inverse }) => {
    local.copy(point).applyMatrix4(inverse);
    return Math.abs(local.x) <= 0.5 && Math.abs(local.y) <= 0.5 && Math.abs(local.z) <= 0.5;
  });
}

export interface SiteOptions {
  heading?: number;
  sink?: number;
  footprint?: number;
  ground?: 'lowest' | 'mean';
}

/** Un lugar en la cáscara de fuera (Z hacia fuera). */
export function outsideFrame(lat: number, lon: number, options: SiteOptions = {}): Frame {
  return frameAt({ radius: OUTER_RADIUS, groundRadius: outerGroundRadius }, lat, lon, options);
}

/** Un lugar a una altura fija sobre el centro (un fragmento del anillo, un andén): Z hacia fuera. */
export function flatFrame(lat: number, lon: number, radius: number, heading = 0): Frame {
  return frameAt({ radius, groundRadius: () => radius }, lat, lon, { heading });
}

/** Norte y este del sitio, para orientar por rumbo. */
function tangent(up: Vector3): { north: Vector3; east: Vector3 } {
  let north = new Vector3(0, 0, 1).addScaledVector(up, -up.z);
  if (north.length() < 1e-6) north = new Vector3(1, 0, 0);
  north.normalize();
  return { north, east: north.clone().cross(up).normalize() };
}

/**
 * Un lugar en la cara interior: Z hacia el centro (allí arriba es el micro agujero). Con huella, el suelo es el
 * más hondo de alrededor (lo más lejos del centro): lo construido se hunde en las rocas, no flota sobre ellas.
 */
export function insideFrame(lat: number, lon: number, options: SiteOptions = {}): Frame {
  const { heading = 0, sink = 0, footprint = 0, ground = 'lowest' } = options;
  const out = direction(lat, lon);
  const heights = [innerGroundRadius(out)];
  if (footprint > 0) {
    const degrees = footprint / INNER_RADIUS / DEG;
    for (let k = 0; k < 8; k++) {
      const a = (2 * Math.PI * k) / 8;
      const d = direction(
        lat + degrees * Math.cos(a),
        lon + (degrees * Math.sin(a)) / Math.max(0.2, Math.cos(lat * DEG)),
      );
      heights.push(innerGroundRadius(d));
    }
  }
  const radius =
    ground === 'mean' ? heights.reduce((s, h) => s + h, 0) / heights.length : Math.max(...heights);
  const up = out.clone().negate();
  const { north, east } = tangent(out);
  const h = heading * DEG;
  const forward = north.multiplyScalar(Math.cos(h)).addScaledVector(east, Math.sin(h)).normalize();
  const right = forward.clone().cross(up).normalize();
  const origin = out.multiplyScalar(radius + sink);
  return new Frame(new Matrix4().makeBasis(right, forward, up).setPosition(origin));
}

/**
 * Un lugar de la banda de la Sala del Motor: `phi` alrededor del eje (0 hacia el Eje), `beta` a lo ancho, con Z
 * hacia el centro y +Y a lo largo de la banda (girada `heading` grados).
 */
export function engineFrame(phi: number, beta = 0, heading = 0): Frame {
  const p = enginePoint(phi, beta);
  const up = p.clone().normalize().negate();
  const ahead = enginePoint(phi + 1, beta).sub(p);
  ahead.addScaledVector(up, -ahead.dot(up)).normalize();
  const side = ahead.clone().cross(up).normalize();
  const h = heading * DEG;
  const forward = ahead.multiplyScalar(Math.cos(h)).addScaledVector(side, Math.sin(h)).normalize();
  const right = forward.clone().cross(up).normalize();
  return new Frame(new Matrix4().makeBasis(right, forward, up).setPosition(p));
}

/** Un marco con el origen en `origin`, Z hacia `up` y +Y lo más cerca posible de `towards`. */
export function frameLooking(origin: Vector3, up: Vector3, towards: Vector3): Frame {
  const z = up.clone().normalize();
  const y = towards.clone().addScaledVector(z, -towards.dot(z));
  if (y.lengthSq() < 1e-8) y.set(1, 0, 0).addScaledVector(z, -z.x);
  y.normalize();
  const x = y.clone().cross(z).normalize();
  return new Frame(new Matrix4().makeBasis(x, y, z).setPosition(origin));
}

/** Una pieza larga de `from` a `to` (una caja o un cilindro de eje Z y largo 1), de grosor `width`. */
export function beam(from: Vector3, to: Vector3, width: number, depth = width): Matrix4 {
  const along = to.clone().sub(from);
  const length = along.length();
  const z = along.normalize();
  const helper = Math.abs(z.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const x = helper.clone().cross(z).normalize();
  const y = z.clone().cross(x).normalize();
  return new Matrix4()
    .makeBasis(x, y, z)
    .setPosition(from.clone().add(to).multiplyScalar(0.5))
    .multiply(pieceMatrix([0, 0, 0], [0, 0, 0], [width, depth, length]));
}

/** La base de la banda (eje y sus dos perpendiculares), para lo que se coloca en ella sin marco. */
export { engineBasis, ENGINE_RADIUS };
