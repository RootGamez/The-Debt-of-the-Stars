// El cuerpo del explorador: tronco acolchado, arnés, cinturón con bolsas, libreta y llave, brazos, guantes,
// piernas y botas (✅ Anthony 2026-11-03: traje verde oliva con parches y mangas marrones, lámina del explorador).
// Cada función llena el segmento de un hueso en coordenadas absolutas de diseño (Z arriba, frente +Y).
import { Vector3 } from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  pieceMatrix,
  torus,
  type Triple,
} from '../worlds/procedural/kit';
import {
  between,
  onEllipsoid,
  patch,
  ring,
  ringRadius,
  strap,
  type Ellipsoid,
  type Segment,
} from './explorerParts';

export const SUIT = {
  olive: '#6b7445',
  oliveDark: '#535b35',
  oliveLight: '#7d8852',
  brown: '#8a5a34',
  ochre: '#a5733f',
  leather: '#7a4b2c',
  leatherDark: '#4f3020',
  sole: '#35261c',
  brass: '#b88a3e',
  copper: '#a8643a',
  iron: '#6f6b64',
  cream: '#eee0bf',
  ink: '#4a4038',
  thread: '#3b2c1e',
  glove: '#7f9a8c',
  gloveDark: '#61796d',
} as const;

/** Las articulaciones (marco de diseño). Izquierda en −X. */
export const JOINTS = {
  pelvis: [0, 0, 0.36],
  torso: [0, 0, 0.46],
  head: [0, 0.01, 0.9],
  pack: [0, -0.28, 0.72],
  shoulder: [0.3, 0, 0.78],
  elbow: [0.36, 0.02, 0.6],
  wrist: [0.38, 0.05, 0.46],
  hip: [0.135, 0, 0.34],
  knee: [0.14, 0.015, 0.2],
  ankle: [0.14, 0, 0.085],
} as const satisfies Record<string, Triple>;

/** El tronco acolchado (el traje sobre la pera del cuerpo). */
export const CHEST: Ellipsoid = { center: [0, 0, 0.6], radii: [0.33, 0.3, 0.32] };
const HIPS: Ellipsoid = { center: [0, 0, 0.41], radii: [0.29, 0.26, 0.15] };

const v = (t: Triple): Vector3 => new Vector3(...t);
/** Un punto de una articulación del lado `side` (+1 derecha, −1 izquierda). */
export const sided = (t: Triple, side: number): Triple => [t[0] * side, t[1], t[2]];

function ellipsoid(s: Segment, color: string, e: Ellipsoid, detail = 2): void {
  s.add('suit', color, ball(1, detail), pieceMatrix(e.center, [0, 0, 0], e.radii), 0.02);
}

/** Una costura alrededor del tronco a la altura `z` (el acolchado). */
function seam(s: Segment, e: Ellipsoid, z: number, color: string, lift = 0.004): void {
  const r = ringRadius(e, z) + lift;
  const ratio = e.radii[1] / e.radii[0];
  s.add(
    'suit',
    color,
    ring(1, 0.012 / r, 28, 4),
    pieceMatrix([0, e.center[1], z], [0, 0, 0], [r, r * ratio, r]),
    0,
  );
}

export function buildTorso(s: Segment): void {
  ellipsoid(s, SUIT.olive, CHEST);
  for (const z of [0.42, 0.53, 0.65, 0.77]) seam(s, CHEST, z, SUIT.oliveDark);
  // Cremallera del frente con sus puntadas.
  for (let z = 0.36; z < 0.88; z += 0.025) {
    const at = onEllipsoid(CHEST, 0, z, 0.006);
    s.add(
      'suit',
      SUIT.thread,
      box(),
      pieceMatrix([at.point.x, at.point.y, at.point.z], [0, 0, 0], [0.026, 0.006, 0.008]),
      0,
    );
  }
  // Parches: pecho derecho, tripa izquierda, costado y espalda.
  patch(s, onEllipsoid(CHEST, 0.45, 0.72, 0.004), 0.1, 0.09, SUIT.brown, SUIT.thread, 0.15);
  patch(s, onEllipsoid(CHEST, -0.5, 0.47, 0.004), 0.09, 0.08, SUIT.ochre, SUIT.thread, -0.2);
  patch(s, onEllipsoid(CHEST, 1.6, 0.6, 0.004), 0.08, 0.11, SUIT.brown, SUIT.thread, 0.1);
  patch(s, onEllipsoid(CHEST, -1.9, 0.5, 0.004), 0.1, 0.08, SUIT.ochre, SUIT.thread, 0.3);
  harness(s);
  // El cuello del traje, donde encaja el casco.
  s.add(
    'suit',
    SUIT.oliveDark,
    cone(0.25, 0.22, 16),
    pieceMatrix([0, 0.01, 0.875], [0, 0, 0], [1, 1, 0.07]),
  );
}

/** El arnés: dos tirantes por los hombros, una correa cruzada y la hebilla del pecho. */
function harness(s: Segment): void {
  for (const side of [-1, 1]) {
    const front = [0.9, 0.8, 0.7, 0.58, 0.46].map(
      (z) => onEllipsoid(CHEST, side * 0.38, z, 0.012).point,
    );
    const back = [0.9, 0.8, 0.68, 0.55].map(
      (z) => onEllipsoid(CHEST, side * (Math.PI - 0.4), z, 0.012).point,
    );
    strap(s, [...back.reverse(), new Vector3(side * 0.15, 0, 0.93), ...front], 0.05, SUIT.leather);
  }
  // La correa cruzada, del hombro derecho a la cadera izquierda.
  const diagonal: Vector3[] = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    diagonal.push(onEllipsoid(CHEST, 0.6 - 1.25 * t, 0.86 - 0.42 * t, 0.02).point);
  }
  strap(s, diagonal, 0.042, SUIT.leatherDark);
  // La hebilla del pecho y la correa que une los tirantes.
  const chest = onEllipsoid(CHEST, 0, 0.66, 0.026);
  strap(
    s,
    [onEllipsoid(CHEST, -0.42, 0.66, 0.016).point, onEllipsoid(CHEST, 0.42, 0.66, 0.016).point],
    0.035,
    SUIT.leather,
  );
  buckle(s, chest.point, 0.07, 0.055);
}

/** Una hebilla de latón: marco y pasador. */
function buckle(s: Segment, at: Vector3, width: number, height: number): void {
  const p: Triple = [at.x, at.y, at.z];
  const bar = 0.012;
  for (const dz of [-1, 1]) {
    s.add(
      'metal',
      SUIT.brass,
      box(),
      pieceMatrix([p[0], p[1], p[2] + (dz * height) / 2], [0, 0, 0], [width, 0.014, bar]),
    );
  }
  for (const dx of [-1, 1]) {
    s.add(
      'metal',
      SUIT.brass,
      box(),
      pieceMatrix([p[0] + (dx * width) / 2, p[1], p[2]], [0, 0, 0], [bar, 0.014, height]),
    );
  }
  s.add(
    'metal',
    SUIT.iron,
    box(),
    pieceMatrix([p[0], p[1] + 0.006, p[2]], [0, 0, 0], [0.008, 0.01, height]),
  );
}

/** La cadera y el cinturón con sus cosas. */
export function buildPelvis(s: Segment): void {
  ellipsoid(s, SUIT.olive, HIPS);
  seam(s, HIPS, 0.37, SUIT.oliveDark, 0.002);
  // El cinturón (un óvalo de cuero) y su hebilla grande.
  const z = 0.47;
  const r = ringRadius(CHEST, z) + 0.012;
  s.add(
    'suit',
    SUIT.leather,
    ring(1, 0.03 / r, 32, 4),
    pieceMatrix([0, 0, z], [0, 0, 0], [r, r * 0.92, r * 1.3]),
  );
  buckle(s, onEllipsoid(CHEST, 0, z, 0.03).point, 0.085, 0.06);
  for (const a of [-2.2, -1.2, 1.2, 2.2]) {
    const at = onEllipsoid(CHEST, a, z, 0.026).point;
    s.add(
      'suit',
      SUIT.leatherDark,
      box(),
      pieceMatrix([at.x, at.y, at.z], [0, 0, -a], [0.02, 0.012, 0.07]),
    );
  }
  pouch(s, -0.75, z - 0.07, 0.11);
  pouch(s, -1.4, z - 0.06, 0.09);
  pouch(s, Math.PI - 0.5, z - 0.06, 0.1);
  pouch(s, Math.PI + 0.5, z - 0.06, 0.1);
  notebook(s, onEllipsoid(CHEST, 0.42, z - 0.11, 0.035).point);
  wrench(s, onEllipsoid(CHEST, 1.15, z - 0.05, 0.03).point);
  for (const side of [-1, 1]) {
    patch(
      s,
      onEllipsoid(HIPS, side * 2.6, 0.38, 0.004),
      0.09,
      0.06,
      SUIT.brown,
      SUIT.thread,
      side * 0.2,
    );
  }
}

/** Una bolsa de cuero colgada del cinturón: caja, solapa con su botón. */
function pouch(s: Segment, azimuth: number, z: number, size: number): void {
  const at = onEllipsoid(CHEST, azimuth, z, size * 0.32);
  const p: Triple = [at.point.x, at.point.y, at.point.z];
  const yaw = -azimuth;
  s.add(
    'suit',
    SUIT.leather,
    box(),
    pieceMatrix(p, [0, 0, yaw], [size, size * 0.55, size * 0.9]),
    0.05,
  );
  const flap = at.point.clone().addScaledVector(at.normal, size * 0.04);
  s.add(
    'suit',
    SUIT.leatherDark,
    box(),
    pieceMatrix(
      [flap.x, flap.y, flap.z + size * 0.32],
      [0.15, 0, yaw],
      [size * 1.04, size * 0.6, size * 0.34],
    ),
  );
  const button = at.point.clone().addScaledVector(at.normal, size * 0.32);
  s.add(
    'metal',
    SUIT.brass,
    ball(0.011, 0),
    pieceMatrix([button.x, button.y, button.z + size * 0.16]),
  );
}

/** La libreta del explorador, colgada por delante: tapa, hojas con renglones y anillas. */
function notebook(s: Segment, at: Vector3): void {
  const yaw = -0.42;
  const tilt = 0.12;
  const place = (
    offset: Triple,
    size: Triple,
    color: string,
    kind: 'suit' | 'metal' = 'suit',
  ): void => {
    const m = pieceMatrix([at.x, at.y, at.z], [tilt, 0, yaw]).multiply(
      pieceMatrix(offset, [0, 0, 0], size),
    );
    s.add(kind, color, kind === 'metal' ? cylinder(0.5, 6) : box(), m, 0.02);
  };
  place([0, -0.004, 0], [0.105, 0.008, 0.14], SUIT.leatherDark);
  place([0, 0.004, -0.004], [0.095, 0.01, 0.125], SUIT.cream);
  for (let k = 0; k < 6; k++)
    place([0.004, 0.0095, 0.035 - k * 0.016], [0.07, 0.001, 0.003], SUIT.ink);
  for (let k = 0; k < 5; k++) {
    const m = pieceMatrix([at.x, at.y, at.z], [tilt, 0, yaw]).multiply(
      pieceMatrix([-0.04 + k * 0.02, 0.006, 0.062], [0, 0, Math.PI / 2]),
    );
    s.add('metal', SUIT.iron, torus(0.007, 0.0025, 8, 3), m, 0);
  }
  // La tira que la sujeta al cinturón.
  place([0, -0.006, 0.09], [0.022, 0.006, 0.05], SUIT.leather);
}

/** Una llave inglesa colgada de la cadera derecha. */
function wrench(s: Segment, at: Vector3): void {
  const base = pieceMatrix([at.x, at.y, at.z], [0, 0.12, -1.15]);
  const put = (offset: Triple, size: Triple, rot: Triple = [0, 0, 0]): void => {
    s.add('metal', SUIT.iron, box(), base.clone().multiply(pieceMatrix(offset, rot, size)), 0.04);
  };
  put([0, 0, -0.03], [0.022, 0.012, 0.14]);
  for (const x of [-0.022, 0.022])
    put([x, 0, -0.115], [0.012, 0.012, 0.04], [0, x > 0 ? -0.2 : 0.2, 0]);
  put([0, 0, -0.095], [0.05, 0.013, 0.014]);
  s.add(
    'metal',
    SUIT.iron,
    torus(0.014, 0.004, 8, 3),
    base.clone().multiply(pieceMatrix([0, 0, 0.05])),
  );
  s.add(
    'suit',
    SUIT.leatherDark,
    box(),
    base.clone().multiply(pieceMatrix([0, 0, 0.07], [0, 0, 0], [0.012, 0.006, 0.04])),
  );
}

/** Brazo de arriba (hombro a codo): hombrera remendada y manga acolchada. */
export function buildUpperArm(s: Segment, side: number): void {
  const shoulder = v(sided(JOINTS.shoulder, side));
  const elbow = v(sided(JOINTS.elbow, side));
  s.add(
    'suit',
    SUIT.brown,
    ball(1, 1),
    pieceMatrix([shoulder.x, shoulder.y, shoulder.z + 0.01], [0, 0, 0], [0.105, 0.1, 0.095]),
  );
  s.add('suit', SUIT.oliveLight, cone(0.088, 0.08, 10), between(shoulder, elbow, 1, 1));
  const mid = shoulder.clone().lerp(elbow, 0.55);
  s.add(
    'suit',
    SUIT.oliveDark,
    ring(0.086, 0.009, 12, 3),
    pieceMatrix([mid.x, mid.y, mid.z], [0, side * 0.3, 0]),
  );
  s.add(
    'suit',
    SUIT.ochre,
    box(),
    pieceMatrix(
      [shoulder.x + side * 0.07, shoulder.y + 0.01, shoulder.z - 0.07],
      [0, side * 0.35, 0],
      [0.012, 0.07, 0.06],
    ),
  );
}

/** Antebrazo (codo a muñeca): codera, puños de cuero y la manga. */
export function buildForearm(s: Segment, side: number): void {
  const elbow = v(sided(JOINTS.elbow, side));
  const wrist = v(sided(JOINTS.wrist, side));
  s.add('suit', SUIT.oliveDark, ball(0.082, 1), pieceMatrix([elbow.x, elbow.y, elbow.z]));
  s.add('suit', SUIT.oliveLight, cone(0.08, 0.072, 10), between(elbow, wrist, 1, 1));
  for (const t of [0.35, 0.82]) {
    const at = elbow.clone().lerp(wrist, t);
    s.add(
      'suit',
      SUIT.leather,
      cylinder(0.081 - t * 0.008, 12),
      pieceMatrix([at.x, at.y, at.z], [0.15, side * 0.12, 0], [1, 1, 0.035]),
    );
    s.add(
      'metal',
      SUIT.brass,
      box(),
      pieceMatrix([at.x + side * 0.07, at.y + 0.02, at.z], [0, 0, 0], [0.012, 0.02, 0.025]),
    );
  }
}

/** El guante: palma, cuatro dedos gordos y el puño. */
export function buildHand(s: Segment, side: number): void {
  const wrist = v(sided(JOINTS.wrist, side));
  s.add(
    'suit',
    SUIT.gloveDark,
    cylinder(0.068, 10),
    pieceMatrix([wrist.x, wrist.y, wrist.z - 0.01], [0.15, 0, 0], [1, 1, 0.04]),
  );
  const palm = wrist.clone().add(new Vector3(side * 0.006, 0.012, -0.065));
  s.add(
    'suit',
    SUIT.glove,
    ball(1, 1),
    pieceMatrix([palm.x, palm.y, palm.z], [0.15, 0, 0], [0.058, 0.05, 0.062]),
  );
  for (let k = 0; k < 4; k++) {
    const a = (k - 1.2) * 0.42;
    const base = palm
      .clone()
      .add(new Vector3(side * Math.sin(a) * 0.035, 0.03 + Math.cos(a) * 0.006, -0.03));
    const tip = base
      .clone()
      .add(new Vector3(side * Math.sin(a) * 0.02, 0.025, -0.045 + (k === 0 ? 0.02 : 0)));
    s.add('suit', SUIT.glove, cylinder(1, 6), between(base, tip, 0.024, 0.024));
    s.add('suit', SUIT.glove, ball(0.013, 0), pieceMatrix([tip.x, tip.y, tip.z]));
  }
}

/** Muslo (cadera a rodilla): pernera acolchada con rodillera remendada en la derecha. */
export function buildThigh(s: Segment, side: number): void {
  const hip = v(sided(JOINTS.hip, side));
  const knee = v(sided(JOINTS.knee, side));
  s.add(
    'suit',
    SUIT.olive,
    ball(1, 1),
    pieceMatrix([hip.x, hip.y, hip.z + 0.01], [0, 0, 0], [0.11, 0.11, 0.08]),
  );
  s.add('suit', SUIT.olive, cone(0.1, 0.09, 10), between(hip, knee, 1, 1));
  s.add('suit', SUIT.oliveDark, ball(0.088, 1), pieceMatrix([knee.x, knee.y, knee.z]));
  if (side > 0) {
    s.add(
      'suit',
      SUIT.brown,
      box(),
      pieceMatrix([knee.x, knee.y + 0.075, knee.z + 0.01], [0.1, 0, 0], [0.1, 0.02, 0.09]),
      0.05,
    );
  }
}

/** Espinilla (rodilla a tobillo): el resto de la pernera, que entra en la bota. */
export function buildShin(s: Segment, side: number): void {
  const knee = v(sided(JOINTS.knee, side));
  const ankle = v(sided(JOINTS.ankle, side));
  s.add(
    'suit',
    SUIT.olive,
    cone(0.088, 0.084, 10),
    between(knee, ankle.clone().add(new Vector3(0, 0, 0.05)), 1, 1),
  );
  if (side < 0) {
    s.add(
      'suit',
      SUIT.ochre,
      box(),
      pieceMatrix(
        [knee.x - 0.01, knee.y + 0.08, knee.z - 0.04],
        [0.05, 0, 0.1],
        [0.08, 0.02, 0.07],
      ),
      0.05,
    );
  }
}

/** La bota: caña con vuelta, empeine, puntera, suela gruesa, tacón y la correa con hebilla. */
export function buildFoot(s: Segment, side: number): void {
  const [x, , z] = sided(JOINTS.ankle, side);
  s.add(
    'suit',
    SUIT.leather,
    cylinder(0.092, 12),
    pieceMatrix([x, 0, z + 0.02], [0, 0, 0], [1, 1, 0.1]),
  );
  s.add('suit', SUIT.brown, ring(0.094, 0.018, 14, 4), pieceMatrix([x, 0, z + 0.075]));
  s.add(
    'suit',
    SUIT.leather,
    ball(1, 1),
    pieceMatrix([x, 0.05, 0.05], [0, 0, 0], [0.09, 0.14, 0.05]),
  );
  s.add(
    'suit',
    SUIT.leatherDark,
    ball(1, 1),
    pieceMatrix([x, 0.13, 0.042], [0, 0, 0], [0.078, 0.06, 0.04]),
  );
  s.add(
    'suit',
    SUIT.sole,
    cylinder(1, 14),
    pieceMatrix([x, 0.04, 0.013], [0, 0, 0], [0.098, 0.165, 0.026]),
  );
  s.add('suit', SUIT.sole, box(), pieceMatrix([x, -0.06, 0.028], [0, 0, 0], [0.12, 0.05, 0.03]));
  s.add(
    'suit',
    SUIT.leatherDark,
    box(),
    pieceMatrix([x, 0.02, z + 0.005], [0.5, 0, 0], [0.19, 0.03, 0.022]),
  );
  buckleSide(s, new Vector3(x + side * 0.094, 0.02, z + 0.005), side);
}

function buckleSide(s: Segment, at: Vector3, side: number): void {
  s.add(
    'metal',
    SUIT.brass,
    box(),
    pieceMatrix([at.x + side * 0.004, at.y, at.z], [0, 0, 0], [0.012, 0.032, 0.03]),
  );
  s.add(
    'metal',
    SUIT.iron,
    box(),
    pieceMatrix([at.x + side * 0.01, at.y, at.z], [0, 0, 0], [0.004, 0.006, 0.026]),
  );
}
