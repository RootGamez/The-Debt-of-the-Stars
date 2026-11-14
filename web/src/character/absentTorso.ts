// El tronco de los dos Ausentes vivos (plan de finales, E3): placas de cerámica suaves (pelvis, cintura y pecho,
// cada una en su hueso y encajada en la siguiente), los circuitos de cobre en relieve y la placa de vidrio del pecho
// donde brilla su signo (🟡 D13: ella, un rombo con un punto dentro; él, dos triángulos punta con punta).
// Ella: cintura estrecha y pecho alto (la cadera la hace la túnica); él: pecho y espalda grandes y cintura gruesa.
import { Matrix4, Vector3 } from 'three';
import { ball, box, cylinder, pieceMatrix } from '../worlds/procedural/kit';
import { ring, surfaceMatrix, type SurfacePoint } from './explorerParts';
import { ceramicPlate } from './absentCeramic';
import {
  circuit,
  frostOn,
  sectionsSurface,
  type AbsentContext,
  type AbsentSegment,
} from './absentParts';

/** Lo que entra cada placa bajo la de encima (m). */
const TUCK = 0.03;

/** Columnas alrededor del tronco (con sombreado suave, bastan). */
const TORSO_COLUMNS = 20;

/** La pelvis: solo la de él (la de ella la cubre la túnica entera). */
export function buildPelvis(s: AbsentSegment, c: AbsentContext): void {
  if (c.who === 'cientifica') return;
  const torso = c.shape.torso;
  const bottom = torso[0]?.z ?? 0;
  ceramicPlate(s, c, torso, bottom, c.joints.spine[2], {
    lip: 0,
    tuck: TUCK,
    columns: TORSO_COLUMNS,
  });
  const surface = sectionsSurface(torso);
  // Por detrás, donde no llega el delantal: dos ramas que bajan por las nalgas.
  for (const side of [-1, 1]) {
    circuit(s, c.look.copperDark, surface, [
      [Math.PI, 1.66],
      [Math.PI - side * 0.35, 1.6],
      [Math.PI - side * 0.55, 1.46],
    ]);
  }
}

/** La cintura: una placa con el cobre que baja por delante y por los lados. */
export function buildSpine(s: AbsentSegment, c: AbsentContext): void {
  const torso = c.shape.torso;
  const from = c.joints.spine[2];
  const to = c.joints.chest[2];
  ceramicPlate(s, c, torso, from, to, {
    lip: 0.02,
    tuck: TUCK,
    seams: c.shape.seams,
    columns: TORSO_COLUMNS,
  });
  const surface = sectionsSurface(torso);
  const span = to - from;
  circuit(s, c.look.copper, surface, [
    [0, to - 0.01],
    [0, from + span * 0.25],
  ]);
  for (const side of [-1, 1]) {
    circuit(s, c.look.copperDark, surface, [
      [side * 1.45, from + span * 0.2],
      [side * 1.4, from + span * 0.75],
      [side * 1.0, to - 0.015],
    ]);
    circuit(s, c.look.copper, surface, [
      [side * 0.32, to - 0.01],
      [side * 0.32, from + span * 0.55],
      [side * 0.18, from + span * 0.4],
    ]);
  }
  circuit(s, c.look.copperDark, surface, [
    [Math.PI, from + 0.03],
    [Math.PI, to - 0.01],
  ]);
}

/** El pecho: la placa grande hasta la base del cuello, la placa del signo y los circuitos. */
export function buildChest(s: AbsentSegment, c: AbsentContext): void {
  const torso = c.shape.torso;
  const from = c.joints.chest[2];
  const top = torso[torso.length - 1]?.z ?? from + 0.4;
  ceramicPlate(s, c, torso, from, top, {
    lip: 0.022,
    seams: c.shape.seams,
    columns: TORSO_COLUMNS,
  });
  const surface = sectionsSurface(torso);
  const [plateZ, width, height] = c.shape.plate;
  const at = surface(0, plateZ, 0.004);
  signPlate(s, c, at, width, height);
  chestCircuits(s, c, plateZ, height);
  frostOn(s, surface, [
    [-0.9, plateZ + 0.12],
    [0.85, plateZ + 0.13],
    [0.3, plateZ + 0.16],
    [Math.PI - 0.4, plateZ + 0.1],
    [Math.PI + 0.6, plateZ - 0.05],
  ]);
}

function chestCircuits(s: AbsentSegment, c: AbsentContext, plateZ: number, height: number): void {
  const surface = sectionsSurface(c.shape.torso);
  const from = c.joints.chest[2];
  const shoulder = c.joints.shoulder[2];
  const above = plateZ + height + 0.025;
  const below = plateZ - height - 0.025;
  const wide = c.who === 'esceptico' ? 0.018 : 0.012;
  for (const side of [-1, 1]) {
    // Del signo a los hombros, como unas clavículas, y del signo a la cintura.
    circuit(
      s,
      c.look.copper,
      surface,
      [
        [0, above],
        [side * 0.22, shoulder - 0.03],
        [side * 0.62, shoulder - 0.02],
        [side * 1.05, shoulder - 0.06],
      ],
      wide,
    );
    circuit(
      s,
      c.look.copper,
      surface,
      [
        [side * 0.12, below],
        [side * 0.3, below - 0.05],
        [side * 0.3, from + 0.012],
      ],
      wide,
    );
    circuit(s, c.look.copperDark, surface, [
      [side * 1.2, shoulder - 0.1],
      [side * 1.38, (from + shoulder) / 2],
      [side * 1.42, from + 0.015],
    ]);
    // Los omóplatos.
    circuit(s, c.look.copperDark, surface, [
      [Math.PI, shoulder - 0.08],
      [Math.PI - side * 0.45, shoulder - 0.12],
      [Math.PI - side * 0.62, (from + shoulder) / 2],
    ]);
    if (c.who === 'esceptico') {
      // Él, que forjaba las Puertas, lleva más cobre: dos ramas por costado, como costillas.
      for (const k of [0, 1]) {
        const z = plateZ + 0.03 - k * 0.11;
        circuit(
          s,
          c.look.copperDark,
          surface,
          [
            [side * 0.33, z],
            [side * 0.78, z - 0.02],
            [side * 0.95, z - 0.06],
          ],
          0.015,
        );
      }
    }
  }
  circuit(s, c.look.copperDark, surface, [
    [Math.PI, from + 0.015],
    [Math.PI, shoulder + 0.02],
  ]);
}

/** El marco de un punto de la superficie (X al lado, Y arriba, Z hacia fuera). */
const frameOf = (at: SurfacePoint): Matrix4 => surfaceMatrix(at, [1, 1, 1]);

/** La placa de vidrio del pecho: un óvalo (un disco de veinticuatro lados; nunca un hexágono) con su bisel. */
function signPlate(
  s: AbsentSegment,
  c: AbsentContext,
  at: SurfacePoint,
  width: number,
  height: number,
): void {
  const frame = frameOf(at);
  s.add('glass', c.look.glass, cylinder(1, 24), surfaceMatrix(at, [width, height, 0.02]), 0);
  s.add(
    'metal',
    c.look.copper,
    ring(1, 0.1, 24, 3),
    frame
      .clone()
      .multiply(pieceMatrix([0, 0, 0.004], [0, 0, 0], [width + 0.006, height + 0.006, 0.06])),
    0.02,
  );
  const front = new Matrix4().makeTranslation(0, 0, 0.012);
  const signFrame = frame.clone().multiply(front);
  if (c.who === 'cientifica') diamondWithDot(s, c.look.sign, signFrame, height * 0.82);
  else hourglass(s, c.look.sign, signFrame, height * 0.5);
}

/** Su signo (🟡 D13): un rombo de luz, hueco, con un punto en medio. */
function diamondWithDot(s: AbsentSegment, color: string, frame: Matrix4, size: number): void {
  const half = size / 2;
  const side = half * Math.SQRT2;
  // Cada lado va de un vértice al siguiente: perpendicular a la diagonal que pasa por su centro (no por el medio,
  // que lo convertiría en una X).
  for (const [dx, dy, turn] of [
    [half / 2, half / 2, Math.PI / 4],
    [-half / 2, half / 2, -Math.PI / 4],
    [half / 2, -half / 2, -Math.PI / 4],
    [-half / 2, -half / 2, Math.PI / 4],
  ] as const) {
    s.add(
      'sign',
      color,
      box(),
      frame.clone().multiply(pieceMatrix([dx, dy, 0], [0, 0, turn], [0.014, side + 0.012, 0.008])),
      0,
    );
  }
  s.add(
    'sign',
    color,
    ball(1, 1),
    frame.clone().multiply(pieceMatrix([0, 0, 0.003], [0, 0, 0], [0.015, 0.015, 0.008])),
    0,
  );
}

/** Su signo (🟡 D13, D19): dos triángulos llenos que se tocan por la punta, como un reloj de arena. */
function hourglass(s: AbsentSegment, color: string, frame: Matrix4, radius: number): void {
  // El prisma de tres lados del kit tiene su vértice hacia −Y: arriba, tal cual; abajo, girado media vuelta.
  for (const [y, turn] of [
    [radius, 0],
    [-radius, Math.PI],
  ] as const) {
    s.add(
      'sign',
      color,
      cylinder(1, 3),
      frame.clone().multiply(pieceMatrix([0, y, 0], [0, 0, turn], [radius, radius, 0.01])),
      0,
    );
  }
}

/** El centro de una pieza del tronco (para quien la viste). */
export const torsoPoint = (c: AbsentContext, azimuth: number, z: number, lift = 0): Vector3 =>
  sectionsSurface(c.shape.torso)(azimuth, z, lift).point;
