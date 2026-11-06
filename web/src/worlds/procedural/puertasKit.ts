// Lo que comparten las partes del Archivo de las Puertas por código (Fase 11): la paleta (los Ausentes y otras manos
// sobre piedra oscura; 🟡), el constructor con sus piezas y lo que gira, los marcos que siguen el suelo curvo y la
// pieza que más se repite: una boca de pie, con su zócalo, su aro, sus marcas de reloj y la vista encendida de su
// lado. Pasado de blender/scripts/arte_puertas.py.
import {
  Group,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type Matrix4,
  type Object3D,
} from 'three';
import {
  box,
  cylinder,
  direction,
  frameAt,
  latLon,
  marker,
  piecesToMeshes,
  PieceSet,
  torus,
  type Frame,
  type MarkerProps,
  type PieceKind,
  type Triple,
} from './kit';
import { puertasSurface } from './puertasShape';

export const PALETTE = {
  sandstone: '#D8C49A',
  sandstoneShade: '#B8A27A',
  slate: '#3A3A48',
  rust: '#8A3A22',
  bronze: '#9A7A4A',
  bone: '#D9D2C0',
  verdigris: '#4A8A80',
  obsidian: '#18161E',
  paper: '#E8DEC6',
  stone: '#2C2C3A',
  stoneLight: '#4A4A5C',
  light: '#FFE8C0',
  thread: '#B8C8FF',
} as const;
const P = PALETTE;

/** Lo que se ve al otro lado de las bocas ajenas: cielos, mares y ciudades lejanas. */
export const VIEWS = [
  '#E07830',
  '#7FB8E0',
  '#B83A50',
  '#6AD0A0',
  '#F0D070',
  '#8070D0',
  '#40A0C0',
  '#D0A0E0',
  '#C8E0F0',
  '#E0A060',
  '#5070B0',
  '#A0D060',
] as const;
/** De qué están hechas las bocas de otras manos. */
export const MOUTH_MATERIALS = [
  P.sandstone,
  P.bronze,
  P.bone,
  P.verdigris,
  P.obsidian,
  P.rust,
  P.slate,
] as const;

const DEG = Math.PI / 180;
/** Lo que gira (ANIM_) gira sobre su Y local: el Z del marco de su sitio. */
const Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

/** Rumbo (grados desde el norte hacia el este) de un vector `forward` en el suelo de la dirección `up`. */
function headingOf(up: Vector3, forward: Vector3): number {
  let north = new Vector3(0, 0, 1).addScaledVector(up, -up.z);
  if (north.lengthSq() < 1e-12) north = new Vector3(1, 0, 0);
  north.normalize();
  const east = north.clone().cross(up).normalize();
  return Math.atan2(forward.dot(east), forward.dot(north)) / DEG;
}

/**
 * El marco sobre el suelo en el punto (x, y) del marco `f`, con su +Y en la misma dirección que el de `f` (girado
 * `yaw` grados): en un planetoide de 30 m, lo que está a ocho metros ya se inclina, y cada pieza se pone de pie.
 */
export function groundFrame(f: Frame, x: number, y: number, yaw = 0, sink = 0): Frame {
  const at = f.point([x, y, 0]);
  const { lat, lon } = latLon(at);
  const up = direction(lat, lon);
  const forward = new Vector3().setFromMatrixColumn(f.base, 1);
  return frameAt(puertasSurface, lat, lon, { heading: headingOf(up, forward) + yaw, sink });
}

/** Un marco de un sitio por su lat/lon, mirando con rumbo `heading`. */
export function siteFrame(lat: number, lon: number, heading = 0, sink = 0): Frame {
  return frameAt(puertasSurface, lat, lon, { heading, sink });
}

export interface MouthSpec {
  radius: number;
  material: string;
  /** El color de su lado; sin él, la boca no tiene vista (la de casa que aún está cerrada, o una con su propia malla). */
  view?: string;
  hours?: number;
  /** Alto del zócalo (m). */
  base?: number;
}

export class PuertasBuilder {
  readonly pieces = new PieceSet(211);
  readonly extras: Object3D[] = [];
  readonly markers: Object3D[] = [];

  constructor(readonly materials: Record<PieceKind, Material>) {}

  /** Se choca con ella. */
  solid(color: string, geometry: BufferGeometry, matrix: Matrix4, kind: PieceKind = 'stone'): void {
    this.pieces.add(color, geometry, matrix, kind, { solid: true });
  }

  /** Solo se ve. */
  view(color: string, geometry: BufferGeometry, matrix: Matrix4, kind: PieceKind = 'stone'): void {
    this.pieces.add(color, geometry, matrix, kind, { solid: false });
  }

  /** Brilla sin depender de la luz. */
  lamp(color: string, geometry: BufferGeometry, matrix: Matrix4, glow = 1.2): void {
    this.pieces.add(color, geometry, matrix, 'light', { solid: false, glow, vary: 0 });
  }

  mark(name: string, f: Frame, at: Triple, props: MarkerProps = {}): void {
    this.markers.push(marker(name, f.point(at), f.rotation(), props));
  }

  /** Un grupo con sus propias piezas que gira (ANIM_, `spin` rad/s) sobre el eje `axis` (Z del marco `rotation`). */
  spinning(
    name: string,
    position: Vector3,
    rotation: Quaternion,
    spin: number,
    build: (set: PieceSet) => void,
  ): void {
    const set = new PieceSet(this.extras.length + 307);
    build(set);
    const group = new Group();
    group.name = name;
    group.position.copy(position);
    group.quaternion.copy(rotation).multiply(Y_UP);
    group.userData.spin = spin;
    group.add(...piecesToMeshes(set, this.materials, `puertas_${name.slice('ANIM_'.length)}`));
    this.extras.push(group);
  }

  /**
   * Una boca de pie sobre su zócalo, en el plano XZ del marco (se mira desde −Y), con marcas de reloj en el aro y
   * su vista encendida. Devuelve la altura de su centro.
   */
  mouth(f: Frame, spec: MouthSpec, x = 0): number {
    const { radius, material, view, hours = 12, base = 0 } = spec;
    const centre = base + radius + 0.45;
    // El zócalo se hunde: así no flota donde el suelo baja.
    this.solid(P.stoneLight, box(), f.at([x, 0, base - 0.3], undefined, [radius * 1.3, 1.0, 1.1]));
    this.solid(material, torus(radius, 0.2, 24, 5), f.at([x, 0, centre]));
    for (let k = 0; k < hours; k++) {
      const a = (2 * Math.PI * k) / hours;
      const length = k % 3 === 0 ? 0.34 : 0.18;
      this.view(
        k === 0 ? P.light : material,
        box(),
        f.at(
          [x + Math.cos(a) * (radius + 0.3), -0.05, centre + Math.sin(a) * (radius + 0.3)],
          [0, Math.PI / 2 - a, 0],
          [0.07, 0.08, length],
        ),
      );
    }
    if (view) {
      this.lamp(
        view,
        cylinder(radius - 0.12, 18),
        f.at([x, 0, centre], [Math.PI / 2, 0, 0], [1, 1, 0.02]),
        1.15,
      );
    }
    return centre;
  }
}
