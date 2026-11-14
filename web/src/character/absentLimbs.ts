// Brazos y piernas de los Ausentes vivos (plan de finales, E3): placas de cerámica suaves que encajan en el codo y en
// la rodilla sobre una bola de cobre, el hombro redondo, una línea de circuito por fuera de cada miembro y, en él, la
// rótula. Ella, brazos largos y finos (las piernas las tapa la túnica: solo se ve el tobillo); él, brazos de forjador.
// Coordenadas absolutas de diseño (Z arriba, frente +Y); `side` +1 es la derecha y −1 la izquierda.
import { Vector3 } from 'three';
import { ball, pieceMatrix } from '../worlds/procedural/kit';
import { ceramicPlate } from './absentCeramic';
import { sectionAt } from './absentLoft';
import { limbSections, type LimbSection, type Section } from './absentShape';
import type { AbsentJointName } from './absentSkeleton';
import {
  circuit,
  frostShard,
  sectionsSurface,
  type AbsentContext,
  type AbsentSegment,
} from './absentParts';

/** Columnas alrededor de un miembro y separación entre filas (m): con sombreado suave, bastan. */
const limbColumns = (c: AbsentContext): number => (c.who === 'esceptico' ? 12 : 10);
const LIMB_STEP = 0.1;

/** Las secciones de un miembro en su lado (el izquierdo es el espejo del derecho). */
export function sidedSections(
  c: AbsentContext,
  from: AbsentJointName,
  to: AbsentJointName,
  profile: readonly LimbSection[],
  side: number,
): Section[] {
  return limbSections(c.who, from, to, profile).map((p) => ({ ...p, x: (p.x ?? 0) * side }));
}

/** La altura de un punto `t` del hueso de `from` a `to`. */
const heightAt = (
  c: AbsentContext,
  from: AbsentJointName,
  to: AbsentJointName,
  t: number,
): number => c.joints[from][2] + (c.joints[to][2] - c.joints[from][2]) * t;

const sided = (c: AbsentContext, joint: AbsentJointName, side: number): Vector3 => {
  const [x, y, z] = c.joints[joint];
  return new Vector3(x * side, y, z);
};

/** Una bola de cobre en la articulación: se ve en el hueco entre placas al doblar. */
function jointBall(s: AbsentSegment, c: AbsentContext, at: Vector3, radius: number): void {
  s.add(
    'metal',
    c.look.copperDark,
    ball(1, 1),
    pieceMatrix([at.x, at.y, at.z], [0, 0, 0], [radius, radius, radius]),
    0.03,
  );
}

/** Del hombro al codo: el hombro redondo, el brazo y el cobre por fuera. */
export function buildUpperArm(s: AbsentSegment, c: AbsentContext, side: number): void {
  const { center, radii } = c.shape.shoulder;
  s.add(
    'ceramic',
    c.look.ceramic,
    ball(1, 2),
    pieceMatrix([center[0] * side, center[1], center[2]], [0, 0, 0], radii),
    0.02,
  );
  const sections = sidedSections(c, 'shoulder', 'elbow', c.shape.upperArm, side);
  const elbow = heightAt(c, 'shoulder', 'elbow', 0.97);
  const top = heightAt(c, 'shoulder', 'elbow', 0.08);
  ceramicPlate(s, c, sections, elbow, top, {
    lip: 0.02,
    seams: [heightAt(c, 'shoulder', 'elbow', 0.42)],
    columns: limbColumns(c),
    step: LIMB_STEP,
  });
  const surface = sectionsSurface(sections);
  circuit(s, c.look.copper, surface, [
    [side * 1.5, heightAt(c, 'shoulder', 'elbow', 0.12)],
    [side * 1.55, heightAt(c, 'shoulder', 'elbow', 0.9)],
  ]);
  const at = surface(side * 1.2, heightAt(c, 'shoulder', 'elbow', 0.2), 0);
  frostShard(s, at.point, at.normal, 0.045);
}

/** Del codo a la muñeca: la bola del codo, el antebrazo y su circuito de delante. */
export function buildForearm(s: AbsentSegment, c: AbsentContext, side: number): void {
  const sections = sidedSections(c, 'elbow', 'wrist', c.shape.forearm, side);
  const elbow = sided(c, 'elbow', side);
  jointBall(s, c, elbow, sectionAt(sections, elbow.z).rx * 0.9);
  const wrist = heightAt(c, 'elbow', 'wrist', 1.0);
  const top = heightAt(c, 'elbow', 'wrist', 0.03);
  ceramicPlate(s, c, sections, wrist, top, {
    lip: 0.016,
    tuck: 0.05,
    seams: [heightAt(c, 'elbow', 'wrist', 0.55)],
    columns: limbColumns(c),
    step: LIMB_STEP,
  });
  const surface = sectionsSurface(sections);
  circuit(s, c.look.copper, surface, [
    [side * 0.35, heightAt(c, 'elbow', 'wrist', 0.08)],
    [side * 0.2, heightAt(c, 'elbow', 'wrist', 0.5)],
    [side * 0.2, heightAt(c, 'elbow', 'wrist', 0.82)],
  ]);
  circuit(s, c.look.copperDark, surface, [
    [side * 1.6, heightAt(c, 'elbow', 'wrist', 0.1)],
    [side * 1.6, heightAt(c, 'elbow', 'wrist', 0.8)],
  ]);
  const at = surface(side * 1.0, heightAt(c, 'elbow', 'wrist', 0.45), 0);
  frostShard(s, at.point, at.normal, 0.04);
}

/** Muslo (cadera a rodilla). Su espalda junto a la cadera es lo que apoya al sentarse (thighRadius). */
export function buildThigh(s: AbsentSegment, c: AbsentContext, side: number): void {
  if (c.shape.thigh.length === 0) return;
  const sections = sidedSections(c, 'hip', 'knee', c.shape.thigh, side);
  const knee = heightAt(c, 'hip', 'knee', 0.97);
  const top = sections[sections.length - 1]?.z ?? c.joints.hip[2];
  ceramicPlate(s, c, sections, knee, top, {
    lip: 0.022,
    seams: [heightAt(c, 'hip', 'knee', 0.5)],
    columns: limbColumns(c),
    step: LIMB_STEP,
  });
  // Por fuera, donde no llega el delantal.
  circuit(
    s,
    c.look.copper,
    sectionsSurface(sections),
    [
      [side * 1.45, heightAt(c, 'hip', 'knee', 0.12)],
      [side * 1.5, heightAt(c, 'hip', 'knee', 0.9)],
    ],
    0.016,
  );
}

/** Espinilla (rodilla a tobillo): la bola de la rodilla, la rótula (él) y el circuito que baja por delante. */
export function buildShin(s: AbsentSegment, c: AbsentContext, side: number): void {
  const sections = sidedSections(c, 'knee', 'ankle', c.shape.shin, side);
  const ankle = heightAt(c, 'knee', 'ankle', 1.0);
  const top = sections[sections.length - 1]?.z ?? c.joints.knee[2];
  const hidden = c.shape.thigh.length === 0;
  if (!hidden) {
    const knee = sided(c, 'knee', side);
    jointBall(s, c, knee, sectionAt(sections, knee.z).rx * 0.92);
    // La rótula: una placa ovalada por delante de la rodilla.
    s.add(
      'ceramic',
      c.look.ceramicShade,
      ball(1, 1),
      pieceMatrix([knee.x, knee.y + 0.06, knee.z - 0.01], [0, 0, 0], [0.06, 0.035, 0.07]),
      0.02,
    );
  }
  ceramicPlate(s, c, sections, ankle, top, {
    lip: 0.016,
    tuck: hidden ? 0 : 0.05,
    columns: hidden ? 10 : limbColumns(c),
    step: LIMB_STEP,
  });
  if (hidden) return;
  const surface = sectionsSurface(sections);
  circuit(
    s,
    c.look.copper,
    surface,
    [
      [side * 0.25, heightAt(c, 'knee', 'ankle', 0.12)],
      [side * 0.12, heightAt(c, 'knee', 'ankle', 0.85)],
    ],
    0.015,
  );
  const at = surface(side * 0.2, heightAt(c, 'knee', 'ankle', 0.2), 0);
  frostShard(s, at.point, at.normal, 0.045);
}
