// Lo que comparten las partes del Observatorio (Fase 11): la paleta, el constructor con sus juegos de piezas
// (lo fijo, lo que solo se enciende en la alineación de las 6:30 y lo que gira) y las marcas pendientes. Gramática de los Ausentes (🟡): anillos y estratos; aquí arenisca
// clara, pizarra índigo, latón y luz ámbar.
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
  piecesToMeshes,
  PieceSet,
  type Frame,
  type MarkerProps,
  type PieceKind,
  type Triple,
  cylinder,
  cone,
  ball,
} from './kit';

export const PALETTE = {
  sandstone: '#b8ad94',
  sandstoneShade: '#8e8570',
  sandstoneLight: '#d4c9ae',
  slate: '#3b4468',
  slateDark: '#222640',
  brass: '#a88a50',
  brassLight: '#d2b36c',
  paper: '#e6dec8',
  amber: '#ffc070',
  amberSoft: '#d98a3c',
  cloth: '#6b3d58',
  clothLight: '#9a5b78',
  glass: '#a8dcff',
  /** La luz fría de la mesa de placas. */
  plate: '#9fb8ff',
  /** El sello del Consejo. */
  seal: '#8a2f3a',
  rock: '#3a3a5a',
  dust: '#77778a',
} as const;

/** Las piezas que giran (ANIM_) tienen su Y local hacia arriba, como en glTF. */
export const Y_UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);

/** El evento de la cronología en que se enciende lo del Observatorio (la alineación de las 6:30). */
export const ALIGNMENT_EVENT = 'alineacion';

export interface PendingMarker {
  name: string;
  frame: Frame;
  at: Triple;
  props?: MarkerProps;
}

export class ObsBuilder {
  readonly pieces = new PieceSet(71);
  /** Lo que solo se enciende durante la alineación (EVT_). */
  readonly alignment = new PieceSet(72);
  /** El cristal (la ranura de la cúpula): se ve a través de él y no deja pasar el aire. */
  readonly glass: BufferGeometry[] = [];
  readonly markers: PendingMarker[] = [];
  /** Las piezas que giran (ANIM_). */
  readonly extras: Object3D[] = [];

  constructor(private readonly materials: Record<PieceKind, Material>) {}

  /** Pieza que se ve y se pisa o choca. */
  solid(
    color: string,
    geometry: Parameters<PieceSet['add']>[1],
    matrix: Parameters<PieceSet['add']>[2],
    kind: PieceKind = 'stone',
  ): void {
    this.pieces.add(color, geometry, matrix, kind, { solid: true });
  }

  /** Pieza que solo se ve (no estorba al caminar). */
  view(
    color: string,
    geometry: Parameters<PieceSet['add']>[1],
    matrix: Parameters<PieceSet['add']>[2],
    kind: PieceKind = 'stone',
  ): void {
    this.pieces.add(color, geometry, matrix, kind, { solid: false });
  }

  /** Metal de latón que se ve (no choca). */
  brass(
    geometry: Parameters<PieceSet['add']>[1],
    matrix: Parameters<PieceSet['add']>[2],
    color: string = PALETTE.brass,
  ): void {
    this.pieces.add(color, geometry, matrix, 'metal', { solid: false });
  }

  /** Luz ámbar que no depende de la Brasa. */
  lamp(
    geometry: Parameters<PieceSet['add']>[1],
    matrix: Parameters<PieceSet['add']>[2],
    color: string = PALETTE.amber,
    glow = 1.4,
  ): void {
    this.pieces.add(color, geometry, matrix, 'light', { glow, vary: 0 });
  }

  mark(name: string, frame: Frame, at: Triple, props?: MarkerProps): void {
    this.markers.push(props ? { name, frame, at, props } : { name, frame, at });
  }

  /** Un cristal: geometría suelta con su matriz (no se pisa). */
  pane(geometry: BufferGeometry, matrix: Matrix4): void {
    this.glass.push(geometry.clone().applyMatrix4(matrix));
  }

  /** Una pieza que gira sobre su vertical, con sus propias mallas. */
  spinning(
    name: string,
    frame: Frame,
    at: Triple,
    props: MarkerProps,
    build: (set: PieceSet) => void,
  ): void {
    const set = new PieceSet(this.extras.length + 80);
    build(set);
    const group = new Group();
    group.name = name;
    group.position.copy(frame.point(at));
    group.quaternion.copy(frame.rotation().multiply(Y_UP));
    Object.assign(group.userData, props);
    group.add(...piecesToMeshes(set, this.materials, `observatorio_${name.slice('ANIM_'.length)}`));
    this.extras.push(group);
  }

  /** Un farol: poste de pizarra, capuchón de latón y la luz de dentro. */
  lantern(f: Frame, x: number, y: number, z = 0, height = 2.2): void {
    this.solid(
      PALETTE.slateDark,
      cylinder(0.06, 6),
      f.at([x, y, z + height / 2], undefined, [1, 1, height]),
    );
    this.brass(cone(0.22, 0.12, 6), f.at([x, y, z + height + 0.08], undefined, [1, 1, 0.22]));
    this.lamp(ball(0.13, 1), f.at([x, y, z + height - 0.02]));
  }
}
