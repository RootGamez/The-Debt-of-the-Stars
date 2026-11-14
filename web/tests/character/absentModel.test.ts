// Los dos Ausentes vivos montados (plan de finales, E3): miden lo que los de los murales (más de 2,5 m), caben en
// su presupuesto (≤ 3.000 triángulos), están de pie sobre sus pies y miran hacia −Z como el explorador, se sientan
// con las caderas sobre el asiento, y la escarcha y el brillo del signo salen de la pose.
import { describe, expect, it } from 'vitest';
import { Box3, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { ABSENT_HEIGHT } from '../../src/character/absent';
import { buildAbsent, type AbsentRig } from '../../src/character/absentModel';
import {
  absentPose,
  ABSENT_POSE_NAMES,
  ABSENT_WHO,
  DEFAULT_SEAT,
} from '../../src/character/absentPoses';
import { thighRadius } from '../../src/character/absentSkeleton';

const rigs = Object.fromEntries(ABSENT_WHO.map((who) => [who, buildAbsent(who)])) as Record<
  (typeof ABSENT_WHO)[number],
  AbsentRig
>;

const boxOf = (o: Object3D): Box3 => {
  o.updateWorldMatrix(true, true);
  const box = new Box3();
  o.traverseVisible((child) => {
    if (child instanceof Mesh) box.expandByObject(child);
  });
  return box;
};

/** Solo las mallas del propio hueso, sin los huesos que cuelgan de él. */
const ownBoxOf = (bone: Object3D): Box3 => {
  bone.updateWorldMatrix(true, true);
  const box = new Box3();
  for (const child of bone.children) if (child instanceof Mesh) box.expandByObject(child);
  return box;
};

const glowOf = (rig: AbsentRig): number => rig.materials.sign.emissiveIntensity;

describe('the two living Absent, built', () => {
  it('stand as tall as the Absent of the murals, well above 2.5 m, with the feet on the ground', () => {
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      rig.setPose(absentPose(who, 'frozen', 0));
      const box = boxOf(rig.root);
      expect(box.max.y).toBeGreaterThan(2.5);
      expect(box.max.y).toBeLessThan(ABSENT_HEIGHT + 0.06);
      expect(box.min.y).toBeGreaterThan(-0.02);
      expect(box.min.y).toBeLessThan(0.03);
    }
  });

  it('keeps within the budget of a character (3,000 triangles), frost included', () => {
    for (const who of ABSENT_WHO) {
      expect(rigs[who].triangles).toBeGreaterThan(1200);
      expect(rigs[who].triangles).toBeLessThanOrEqual(3000);
    }
  });

  it('faces −Z like the explorer: the feet and the sign point forward', () => {
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      rig.setPose(absentPose(who, 'standing', 0));
      const foot = boxOf(rig.bones.footR);
      expect(foot.min.z).toBeLessThan(-0.15);
      const sign = rig.root.getObjectByName(`AUSENTE_${who}_chest_sign`);
      expect(sign).toBeDefined();
      if (sign) expect(boxOf(sign).getCenter(new Vector3()).z).toBeLessThan(-0.12);
    }
  });

  it('has a head of dark glass with no face, and a sign of its own on the chest', () => {
    for (const who of ABSENT_WHO) {
      const head = rigs[who].bones.head;
      const kinds = head.children
        .filter((c) => c instanceof Mesh)
        .map((c) => c.name.split('_').pop());
      expect(kinds).toContain('glass');
      expect(kinds).toContain('glow');
      expect(kinds).not.toContain('ceramic');
    }
    const sign = (who: (typeof ABSENT_WHO)[number]): number =>
      (rigs[who].root.getObjectByName(`AUSENTE_${who}_chest_sign`) as Mesh).geometry.getAttribute(
        'position',
      ).count;
    expect(sign('cientifica')).not.toBe(sign('esceptico'));
  });

  it('sits with the thighs on the seat and the feet on the floor', () => {
    for (const who of ABSENT_WHO) {
      for (const [name, seat] of [
        ['seated', DEFAULT_SEAT.seated],
        ['slumped', DEFAULT_SEAT.slumped],
      ] as const) {
        const rig = rigs[who];
        rig.setPose(absentPose(who, name, 0));
        const thigh = ownBoxOf(rig.bones.thighR);
        // Lo más bajo del muslo es lo que apoya (con un margen por las facetas del cono).
        expect(thigh.min.y).toBeGreaterThan(seat - 0.04);
        expect(thigh.min.y).toBeLessThan(seat + 0.03);
        const feet = boxOf(rig.bones.footL).union(boxOf(rig.bones.footR));
        expect(feet.min.y).toBeGreaterThan(-0.03);
        expect(feet.min.y).toBeLessThan(0.03);
        // Las rodillas por delante (−Z).
        expect(boxOf(rig.bones.shinR).min.z).toBeLessThan(-0.45);
        expect(thighRadius(who)).toBeGreaterThan(0.1);
      }
    }
  });

  it('rests the hands on top of the thighs when seated, not in the air beside them', () => {
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      rig.setPose(absentPose(who, 'seated', 0));
      rig.root.updateMatrixWorld(true);
      for (const [hand, thigh] of [
        [rig.bones.handL, rig.bones.thighL],
        [rig.bones.handR, rig.bones.thighR],
      ] as const) {
        const box = ownBoxOf(thigh);
        const wrist = new Vector3().setFromMatrixPosition(hand.matrixWorld);
        expect(wrist.x).toBeGreaterThan(box.min.x - 0.03);
        expect(wrist.x).toBeLessThan(box.max.x + 0.03);
        expect(wrist.y).toBeGreaterThan(box.getCenter(new Vector3()).y);
      }
    }
  });

  it('frosts over when frozen and thaws back, and the sign glows with the pose', () => {
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      const ceramic = rig.materials.ceramic;
      rig.setPose(absentPose(who, 'standing', 0));
      const warm = ceramic.color.clone();
      const lit = glowOf(rig);
      const frost = rig.root.getObjectByName(`AUSENTE_${who}_head_frost`);
      expect(frost?.visible).toBe(false);
      rig.setPose(absentPose(who, 'frozen', 0));
      expect(frost?.visible).toBe(true);
      expect(ceramic.color.b).toBeGreaterThan(ceramic.color.r); // azulado
      expect(ceramic.roughness).toBeGreaterThan(0.9); // mate
      expect(glowOf(rig)).toBeLessThan(lit);
      rig.setPose(absentPose(who, 'standing', 0));
      expect(ceramic.color.equals(warm)).toBe(true);
      expect(frost?.visible).toBe(false);
    }
  });

  it('breathes with the chest and sets every pose without losing a bone', () => {
    const rig = rigs.esceptico;
    for (const name of ABSENT_POSE_NAMES) {
      for (const t of [0, 1.7, 4.2]) {
        rig.setPose(absentPose('esceptico', name, t));
        rig.root.updateMatrixWorld(true);
        for (const bone of Object.values(rig.bones)) {
          const at = new Vector3().setFromMatrixPosition(bone.matrixWorld);
          expect(Number.isFinite(at.x + at.y + at.z)).toBe(true);
        }
      }
    }
  });

  it('gives each rig its own materials, and lets them go', () => {
    expect(rigs.cientifica.materials.ceramic).not.toBe(rigs.esceptico.materials.ceramic);
    const spare = buildAbsent('cientifica');
    const material = spare.materials.glass;
    expect(material).toBeInstanceOf(MeshStandardMaterial);
    let disposed = false;
    material.addEventListener('dispose', () => {
      disposed = true;
    });
    spare.dispose();
    expect(disposed).toBe(true);
  });
});
