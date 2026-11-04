// La cabeza del explorador (un Ool joven) y lo que lleva encima: el casco de burbuja con su cuello de latón,
// remaches, banda y discos de las orejas, y la mochila con el tanque de aire y la manguera (lámina del explorador).
// El casco va fijo al tronco, como el de un buzo: dentro, la cabeza asiente sin moverlo.
import {
  CatmullRomCurve3,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import {
  ball,
  box,
  cone,
  cylinder,
  pieceMatrix,
  torus,
  torusArc,
  type Triple,
} from '../worlds/procedural/kit';
import type { OolLook } from '../worlds/procedural/ool';
import { SUIT } from './explorerBody';
import {
  between,
  onEllipsoid,
  patch,
  ring,
  strap,
  type Ellipsoid,
  type Segment,
} from './explorerParts';

/** El cristal del casco: centro, radio y la altura del cuello donde se corta. */
export const HELMET = { center: [0, 0.02, 1.05] as Triple, radius: 0.365, collar: 0.86 };
const HEAD: Ellipsoid = { center: [0, 0.015, 1.04], radii: [0.3, 0.28, 0.26] };
/** Hasta dónde llegan los filamentos sin tocar el cristal (desde su centro). */
const INSIDE = HELMET.radius - 0.035;
const EYE = '#15181d';
/** A qué altura (z de diseño) están sus ojos: la cámara va ahí (data/movement.ts, EYE_HEIGHT). */
export const EYE_Z = 1.06;
const SHINE = '#f4fbff';

const v = (t: Triple): Vector3 => new Vector3(...t);

/** La cabeza: musgo, ojos grandes con brillo, fibras, filamentos con la punta encendida y motas de luz. */
export function buildHead(s: Segment, look: OolLook): void {
  s.add('suit', look.body, ball(1, 2), pieceMatrix(HEAD.center, [0, 0, 0], HEAD.radii), 0.02);
  // Las mejillas, un poco hinchadas, y la boca pequeña.
  for (const x of [-0.14, 0.14]) {
    s.add(
      'suit',
      look.fiber,
      ball(1, 1),
      pieceMatrix([x, 0.2, 0.97], [0, 0, 0], [0.09, 0.06, 0.07]),
    );
  }
  s.add(
    'suit',
    '#3c5a4c',
    box(),
    pieceMatrix([0, 0.288, 0.955], [0, 0, 0], [0.035, 0.006, 0.006]),
    0,
  );
  for (const x of [-0.11, 0.11]) {
    s.add(
      'suit',
      EYE,
      ball(1, 1),
      pieceMatrix([x, 0.26, EYE_Z], [0, 0, x * 1.2], [0.078, 0.036, 0.098]),
      0,
    );
    s.add('glow', SHINE, ball(0.02, 0), pieceMatrix([x - 0.024, 0.293, 1.1]), 0);
    s.add('glow', SHINE, ball(0.009, 0), pieceMatrix([x + 0.022, 0.291, 1.03]), 0);
  }
  fibers(s, look);
  filaments(s, look);
  for (let k = 0; k < look.dots; k++) {
    const azimuth = (s.next() - 0.5) * 5.2;
    const z = 0.95 + s.next() * 0.25;
    // Sin motas sobre los ojos.
    if (Math.abs(azimuth) < 0.6 && z > 0.98) continue;
    const at = onEllipsoid(HEAD, azimuth, z, 0.004).point;
    s.add('glow', look.glow, ball(0.012 + s.next() * 0.008, 0), pieceMatrix([at.x, at.y, at.z]), 0);
  }
}

/** Fibras de musgo por la cabeza, más por arriba y por detrás (la cara queda limpia). */
function fibers(s: Segment, look: OolLook): void {
  for (let k = 0; k < 70; k++) {
    const azimuth = Math.PI + (s.next() - 0.5) * 2 * Math.PI;
    const z = 0.95 + s.next() * 0.33;
    if (Math.abs(Math.atan2(Math.sin(azimuth), Math.cos(azimuth))) < 0.9 && z < 1.18) continue;
    const { point, normal } = onEllipsoid(HEAD, azimuth, z);
    const tip = point
      .clone()
      .addScaledVector(normal, 0.04 + s.next() * 0.05)
      .add(new Vector3(0, 0, -0.012));
    s.add(
      'suit',
      s.next() < 0.5 ? look.fiber : look.body,
      cone(1, 0, 3),
      between(point, tip, 0.035),
      0.05,
    );
  }
}

/** Los filamentos: salen de arriba, se curvan hacia fuera y su punta brilla, sin tocar el cristal. */
function filaments(s: Segment, look: OolLook): void {
  const center = v(HELMET.center);
  const count = 7;
  for (let k = 0; k < count; k++) {
    const a = ((k - (count - 1) / 2) / (count - 1)) * 2.4 + (k % 2 ? 0.15 : -0.1);
    const back = k % 2 ? -0.07 : 0.02;
    const base = new Vector3(Math.sin(a) * 0.12, back, 1.25 + Math.cos(a) * 0.03);
    const out = new Vector3(Math.sin(a), back * 2, 0.9).normalize();
    const points = [base];
    for (let j = 1; j <= 3; j++) {
      const previous = points[j - 1] ?? base;
      const bend = out
        .clone()
        .add(new Vector3(Math.sin(a) * j * 0.25, 0, -j * 0.12))
        .normalize();
      const next = previous.clone().addScaledVector(bend, look.filamentLength * 0.32);
      // Que no atraviese el cristal: se queda dentro, a un dedo.
      const fromCenter = next.clone().sub(center);
      if (fromCenter.length() > INSIDE)
        next.copy(center).addScaledVector(fromCenter.normalize(), INSIDE);
      points.push(next);
    }
    for (let j = 1; j < points.length; j++) {
      const a0 = points[j - 1];
      const a1 = points[j];
      if (a0 && a1)
        s.add('suit', look.fiber, cylinder(1, 4), between(a0, a1, 0.022 - j * 0.003), 0.04);
    }
    const tip = points[points.length - 1] ?? base;
    s.add('glow', look.glow, ball(0.024, 1), pieceMatrix([tip.x, tip.y, tip.z]), 0);
  }
}

/** El cristal del casco, cortado en el cuello. */
function glassGeometry(): BufferGeometry {
  const cut = Math.PI - Math.acos((HELMET.center[2] - HELMET.collar) / HELMET.radius);
  return new SphereGeometry(HELMET.radius, 32, 20, 0, Math.PI * 2, 0, cut)
    .toNonIndexed()
    .rotateX(Math.PI / 2)
    .translate(...HELMET.center);
}

export function buildHelmet(s: Segment): void {
  s.add('glass', '#dff4ff', glassGeometry(), pieceMatrix(), 0);
  // Reflejos del cristal: dos arcos finos arriba a la izquierda y uno abajo a la derecha.
  const [cx, cy, cz] = HELMET.center;
  const r = HELMET.radius + 0.002;
  for (const [from, to, tilt, yaw] of [
    [0.7, 1.4, 0.55, 0.5],
    [0.9, 1.3, 0.75, 0.62],
    [-0.4, 0.1, -0.2, -0.75],
  ] as const) {
    s.add(
      'shine',
      '#ffffff',
      torusArc(r, 0.006, from, to, 10, 3),
      pieceMatrix([cx, cy, cz], [tilt, 0, yaw]),
      0,
    );
  }
  collar(s);
  band(s);
  for (const side of [-1, 1]) ear(s, side);
}

/** El cuello de latón: dos anillos, remaches y el cobre gastado debajo. */
function collar(s: Segment): void {
  const r = Math.sqrt(HELMET.radius ** 2 - (HELMET.center[2] - HELMET.collar) ** 2);
  s.add(
    'metal',
    SUIT.brass,
    ring(r + 0.01, 0.034, 32, 6),
    pieceMatrix([0, HELMET.center[1], HELMET.collar]),
    0.03,
  );
  s.add(
    'metal',
    SUIT.copper,
    ring(r - 0.01, 0.026, 32, 5),
    pieceMatrix([0, HELMET.center[1], HELMET.collar - 0.045]),
    0.05,
  );
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    const at: Triple = [
      Math.sin(a) * (r + 0.042),
      HELMET.center[1] + Math.cos(a) * (r + 0.042),
      HELMET.collar + 0.004,
    ];
    s.add('metal', SUIT.iron, ball(0.011, 0), pieceMatrix(at), 0.04);
  }
}

/** La banda de metal que cruza el casco por arriba, de oreja a oreja, con sus remaches. */
function band(s: Segment): void {
  const r = HELMET.radius + 0.008;
  const [cx, cy, cz] = HELMET.center;
  s.add(
    'metal',
    SUIT.copper,
    torusArc(r, 0.016, -0.35, Math.PI + 0.35, 28, 4),
    pieceMatrix([cx, cy, cz], [0, 0, 0], [1, 1.6, 1]),
    0.04,
  );
  for (let k = 0; k <= 14; k++) {
    const a = -0.3 + (k / 14) * (Math.PI + 0.6);
    s.add(
      'metal',
      SUIT.brass,
      ball(0.009, 0),
      pieceMatrix([cx + Math.cos(a) * (r + 0.016), cy + 0.022, cz + Math.sin(a) * (r + 0.016)]),
      0,
    );
  }
}

/** Un disco de la oreja: tapa redonda, anillo, tornillo del centro y seis pernos. */
function ear(s: Segment, side: number): void {
  const x = side * (HELMET.radius + 0.01);
  const [, cy, cz] = HELMET.center;
  const at: Triple = [x, cy, cz - 0.06];
  const across: Triple = [0, Math.PI / 2, 0];
  s.add('metal', SUIT.copper, cylinder(0.085, 16), pieceMatrix(at, across, [1, 1, 0.035]), 0.04);
  s.add(
    'metal',
    SUIT.brass,
    torus(0.07, 0.012, 16, 4),
    pieceMatrix([x + side * 0.02, cy, at[2]], [0, 0, Math.PI / 2]),
  );
  s.add(
    'metal',
    SUIT.iron,
    cylinder(0.028, 8),
    pieceMatrix([x + side * 0.025, cy, at[2]], across, [1, 1, 0.03]),
  );
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    s.add(
      'metal',
      SUIT.iron,
      ball(0.01, 0),
      pieceMatrix([x + side * 0.02, cy + Math.cos(a) * 0.055, at[2] + Math.sin(a) * 0.055]),
      0,
    );
  }
}

/** Dónde entra la manguera en el casco (el disco de la oreja derecha). */
export const HOSE_END: Triple = [
  HELMET.radius + 0.04,
  HELMET.center[1] - 0.02,
  HELMET.center[2] - 0.12,
];

/** La mochila: caja de lona con tapa, correas y hebillas, remiendos, bolsillos y el tanque de latón al lado. */
export function buildPack(s: Segment): void {
  const center: Triple = [0, -0.4, 0.66];
  s.add('suit', SUIT.brown, box(), pieceMatrix(center, [0, 0, 0], [0.36, 0.16, 0.36]), 0.04);
  s.add(
    'suit',
    SUIT.leather,
    box(),
    pieceMatrix([0, -0.405, 0.86], [0.08, 0, 0], [0.38, 0.18, 0.06]),
    0.04,
  );
  for (const x of [-0.11, 0.11]) {
    strap(s, [v([x, -0.49, 0.88]), v([x, -0.49, 0.48])], 0.045, SUIT.leatherDark);
    s.add(
      'metal',
      SUIT.brass,
      box(),
      pieceMatrix([x, -0.5, 0.74], [0, 0, 0], [0.055, 0.012, 0.04]),
    );
  }
  strap(s, [v([-0.19, -0.49, 0.62]), v([0.19, -0.49, 0.62])], 0.04, SUIT.leather);
  patch(
    s,
    { point: v([-0.06, -0.485, 0.53]), normal: new Vector3(0, -1, 0) },
    0.1,
    0.08,
    SUIT.ochre,
    SUIT.thread,
    0.2,
  );
  for (const x of [-0.12, 0.12]) {
    s.add(
      'suit',
      SUIT.leather,
      box(),
      pieceMatrix([x, -0.5, 0.52], [0, 0, 0], [0.1, 0.06, 0.1]),
      0.05,
    );
    s.add(
      'suit',
      SUIT.leatherDark,
      box(),
      pieceMatrix([x, -0.53, 0.57], [0.2, 0, 0], [0.105, 0.012, 0.04]),
    );
  }
  // Las tiras que bajan de los hombros a la mochila.
  for (const x of [-0.17, 0.17])
    s.add(
      'suit',
      SUIT.leather,
      box(),
      pieceMatrix([x, -0.31, 0.84], [0.4, 0, 0], [0.05, 0.1, 0.012]),
    );
  tank(s);
  hose(s);
}

/** El tanque de aire: cilindro de latón con cúpulas, aros, la válvula y su rueda. */
function tank(s: Segment): void {
  const x = 0.28;
  const y = -0.33;
  s.add(
    'metal',
    SUIT.brass,
    cylinder(0.078, 14),
    pieceMatrix([x, y, 0.7], [0, 0, 0], [1, 1, 0.28]),
    0.04,
  );
  for (const z of [0.56, 0.84])
    s.add('metal', SUIT.brass, ball(1, 1), pieceMatrix([x, y, z], [0, 0, 0], [0.078, 0.078, 0.04]));
  for (const z of [0.62, 0.78])
    s.add('metal', SUIT.copper, ring(0.08, 0.009, 16, 4), pieceMatrix([x, y, z]));
  s.add('suit', SUIT.leatherDark, ring(0.082, 0.012, 16, 3), pieceMatrix([x, y, 0.7]));
  s.add('metal', SUIT.iron, cylinder(0.02, 8), pieceMatrix([x, y, 0.9], [0, 0, 0], [1, 1, 0.06]));
  s.add(
    'metal',
    SUIT.copper,
    torus(0.032, 0.007, 12, 3),
    pieceMatrix([x, y, 0.935], [Math.PI / 2, 0, 0]),
  );
  patch(
    s,
    { point: v([x + 0.078, y, 0.68]), normal: new Vector3(1, 0, 0) },
    0.06,
    0.08,
    SUIT.ochre,
    SUIT.thread,
  );
}

/** La manguera de goma, anillada, del tanque a la oreja del casco por encima del hombro. */
function hose(s: Segment): void {
  const curve = new CatmullRomCurve3([
    v([0.28, -0.33, 0.93]),
    v([0.3, -0.31, 1.02]),
    v([0.4, -0.2, 1.08]),
    v([0.46, -0.06, 1.0]),
    v(HOSE_END),
  ]);
  s.add('suit', '#3e3a33', new TubeGeometry(curve, 24, 0.022, 6).toNonIndexed(), pieceMatrix(), 0);
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    const at = curve.getPoint(t);
    const along = curve.getTangent(t);
    s.add(
      'suit',
      '#2c2924',
      cylinder(0.026, 6),
      between(
        at.clone().addScaledVector(along, -0.006),
        at.clone().addScaledVector(along, 0.006),
        1,
        1,
      ),
      0,
    );
  }
}
