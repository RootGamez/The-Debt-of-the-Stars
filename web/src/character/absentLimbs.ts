// Brazos y piernas de los Ausentes vivos (plan de finales, E3): largos y finos, de cerámica, con las articulaciones
// de cobre, una línea de circuito por miembro, manos de tres dedos largos y pies estrechos (como en los murales).
// Coordenadas absolutas de diseño (Z arriba, frente +Y); `side` +1 es la derecha y −1 la izquierda.
import { Vector3 } from 'three';
import { ball, cone, cylinder, pieceMatrix, type Triple } from '../worlds/procedural/kit';
import { HAND_LENGTH, THIGH_TOP_RADIUS } from './absentSkeleton';
import { frostShard, trace, v3, type AbsentContext, type AbsentSegment } from './absentParts';
import { between } from './explorerParts';

const sided = (t: Triple, side: number): Vector3 => v3([t[0] * side, t[1], t[2]]);
const offset = (p: Vector3, x: number, y: number, z: number): Vector3 =>
  p.clone().add(new Vector3(x, y, z));

/** Del hombro al codo: la bola del hombro, el brazo y el cobre por fuera. */
export function buildUpperArm(s: AbsentSegment, c: AbsentContext, side: number): void {
  const l = c.limb;
  const shoulder = sided(c.joints.shoulder, side);
  const elbow = sided(c.joints.elbow, side);
  s.add(
    'ceramic',
    c.look.ceramic,
    ball(1, 1),
    pieceMatrix(
      [shoulder.x + side * 0.015, shoulder.y, shoulder.z + 0.01],
      [0, 0, 0],
      [0.11 * l, 0.105 * l, 0.1 * l],
    ),
  );
  s.add('ceramic', c.look.ceramic, cone(0.075 * l, 0.06 * l, 8), between(shoulder, elbow, 1, 1));
  trace(
    s,
    c.look.copper,
    offset(shoulder, side * 0.074 * l, 0, -0.09),
    offset(elbow, side * 0.06 * l, 0, 0.05),
  );
  frostShard(
    s,
    offset(shoulder, side * 0.05, 0, 0.08),
    new Vector3(side * 0.4, 0.1, 1).normalize(),
    0.05,
  );
}

/** Del codo a la muñeca: el codo de cobre, el antebrazo, su brazalete y el circuito de delante. */
export function buildForearm(s: AbsentSegment, c: AbsentContext, side: number): void {
  const l = c.limb;
  const elbow = sided(c.joints.elbow, side);
  const wrist = sided(c.joints.wrist, side);
  s.add('copper', c.look.copper, ball(0.064 * l, 0), pieceMatrix([elbow.x, elbow.y, elbow.z]));
  s.add('ceramic', c.look.ceramic, cone(0.06 * l, 0.045 * l, 8), between(elbow, wrist, 1, 1));
  s.add(
    'copper',
    c.look.copperDark,
    cylinder(0.053 * l, 8),
    between(elbow.clone().lerp(wrist, 0.8), elbow.clone().lerp(wrist, 0.86), 1, 1),
  );
  trace(s, c.look.copper, offset(elbow, 0, 0.056 * l, -0.06), offset(wrist, 0, 0.045 * l, 0.1));
  frostShard(
    s,
    offset(elbow.clone().lerp(wrist, 0.45), side * 0.05 * l, 0, 0),
    new Vector3(side, 0.2, 0.1).normalize(),
    0.04,
  );
}

/** La mano: palma estrecha y tres dedos largos, un poco curvados hacia delante. */
export function buildHand(s: AbsentSegment, c: AbsentContext, side: number): void {
  const l = c.limb;
  const wrist = sided(c.joints.wrist, side);
  s.add(
    'ceramic',
    c.look.ceramic,
    ball(1, 0),
    pieceMatrix(
      [wrist.x, wrist.y + 0.005, wrist.z - 0.07],
      [0, 0, 0],
      [0.045 * l, 0.028 * l, 0.075],
    ),
  );
  for (const finger of [-1, 0, 1]) {
    const base = offset(wrist, side * finger * 0.022 * l, 0.006, -0.125);
    const tip = offset(wrist, side * (finger * 0.032 * l + 0.004), 0.03, -HAND_LENGTH);
    s.add('ceramic', c.look.ceramicShade, cone(0.015 * l, 0.008 * l, 5), between(base, tip, 1, 1));
  }
  s.add(
    'copper',
    c.look.copper,
    ball(0.012, 0),
    pieceMatrix([wrist.x, wrist.y - 0.028, wrist.z - 0.06]),
  );
}

/** Muslo (cadera a rodilla). Su radio junto a la cadera es lo que apoya al sentarse (thighRadius). */
export function buildThigh(s: AbsentSegment, c: AbsentContext, side: number): void {
  const l = c.limb;
  const hip = sided(c.joints.hip, side);
  const knee = sided(c.joints.knee, side);
  s.add(
    'ceramic',
    c.look.ceramic,
    cone(THIGH_TOP_RADIUS * l, 0.085 * l, 8),
    between(hip, knee, 1, 1),
  );
  trace(
    s,
    c.look.copper,
    offset(hip, side * 0.12 * l, 0, -0.08),
    offset(knee, side * 0.084 * l, 0, 0.06),
  );
}

/** Espinilla (rodilla a tobillo): la rodilla de cobre y el circuito que baja por delante. */
export function buildShin(s: AbsentSegment, c: AbsentContext, side: number): void {
  const l = c.limb;
  const knee = sided(c.joints.knee, side);
  const ankle = sided(c.joints.ankle, side);
  s.add('copper', c.look.copper, ball(0.072 * l, 0), pieceMatrix([knee.x, knee.y, knee.z]));
  s.add(
    'ceramic',
    c.look.ceramic,
    cone(0.08 * l, 0.05 * l, 8),
    between(knee, offset(ankle, 0, 0, 0.03), 1, 1),
  );
  trace(s, c.look.copper, offset(knee, 0, 0.074 * l, -0.08), offset(ankle, 0, 0.05 * l, 0.09));
  frostShard(s, offset(knee, 0, 0.06, 0.02), new Vector3(0, 1, 0.5).normalize(), 0.045);
}

/** El pie: largo y estrecho, con el tobillo de cobre y la punta un poco más oscura. */
export function buildFoot(s: AbsentSegment, c: AbsentContext, side: number): void {
  const l = c.limb;
  const ankle = sided(c.joints.ankle, side);
  s.add(
    'copper',
    c.look.copperDark,
    cylinder(0.055 * l, 8),
    pieceMatrix([ankle.x, ankle.y, ankle.z], [0, 0, 0], [1, 1, 0.035]),
  );
  s.add(
    'ceramic',
    c.look.ceramic,
    ball(1, 1),
    pieceMatrix([ankle.x, 0.06, 0.055], [0, 0, 0], [0.08 * l, 0.2, 0.055]),
  );
  s.add(
    'ceramic',
    c.look.ceramicShade,
    ball(1, 0),
    pieceMatrix([ankle.x, 0.235, 0.04], [0, 0, 0], [0.05 * l, 0.045, 0.03]),
  );
  frostShard(s, v3([ankle.x, 0.12, 0.09]), new Vector3(side * 0.2, 0.3, 1).normalize(), 0.035);
}
