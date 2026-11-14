// Los dos Ausentes vivos montados (plan de finales, E3): él más alto que ella (unos 3 y 2,6 m), con siluetas que se
// leen de lejos (ella de hombros estrechos y caderas anchas, él ancho de hombros), dentro de su presupuesto
// (≤ 12.000 triángulos cada uno), vestidos (ella con túnica y manto, él con chaleco y delantal), con sus aros de oro
// (los de la cabeza flotan sin tocar el vidrio ni sus dibujos), de pie sobre sus pies y mirando hacia −Z, sentados
// con los muslos sobre el asiento, y con la escarcha y el brillo del signo según la pose.
import { describe, expect, it } from 'vitest';
import { Box3, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { buildAbsent, type AbsentBone, type AbsentRig } from '../../src/character/absentModel';
import {
  absentPose,
  ABSENT_POSE_NAMES,
  ABSENT_WHO,
  DEFAULT_SEAT,
  type AbsentWho,
} from '../../src/character/absentPoses';
import { ABSENT_SKELETONS, thighRadius } from '../../src/character/absentSkeleton';
import { ABSENT_SHAPES } from '../../src/character/absentShape';
import { sectionAt } from '../../src/character/absentLoft';

const rigs = Object.fromEntries(ABSENT_WHO.map((who) => [who, buildAbsent(who)])) as Record<
  AbsentWho,
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
const ownMeshes = (bone: Object3D): Mesh[] =>
  bone.children.filter((c): c is Mesh => c instanceof Mesh && c.visible);

const ownBoxOf = (bone: Object3D): Box3 => {
  bone.updateWorldMatrix(true, true);
  const box = new Box3();
  for (const mesh of ownMeshes(bone)) box.expandByObject(mesh);
  return box;
};

/** Los vértices de unas mallas en el mundo (cuerpo: Y arriba, −Z delante). */
function worldPoints(meshes: readonly Mesh[]): Vector3[] {
  const out: Vector3[] = [];
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const position = mesh.geometry.getAttribute('position');
    for (let k = 0; k < position.count; k++)
      out.push(new Vector3().fromBufferAttribute(position, k).applyMatrix4(mesh.matrixWorld));
  }
  return out;
}

const meshesOf = (rig: AbsentRig, bones: readonly AbsentBone[]): Mesh[] =>
  bones.flatMap((name) => ownMeshes(rig.bones[name]));

/** La media anchura de la silueta de frente (m) entre dos alturas. */
function halfWidth(points: readonly Vector3[], from: number, to: number): number {
  return Math.max(0, ...points.filter((p) => p.y >= from && p.y <= to).map((p) => Math.abs(p.x)));
}

const glowOf = (rig: AbsentRig): number => rig.materials.sign.emissiveIntensity;

describe('the two living Absent, built', () => {
  it('stands him taller than her: about 3 m and 2.6 m, well above 2.5 m, with the feet on the ground', () => {
    const tops = {} as Record<AbsentWho, number>;
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      rig.setPose(absentPose(who, 'standing', 0));
      const box = boxOf(rig.root);
      tops[who] = box.max.y;
      expect(box.min.y).toBeGreaterThan(-0.02);
      expect(box.min.y).toBeLessThan(0.03);
    }
    expect(tops.cientifica).toBeGreaterThan(2.55);
    expect(tops.cientifica).toBeLessThan(2.67);
    expect(tops.esceptico).toBeGreaterThan(2.95);
    expect(tops.esceptico).toBeLessThan(3.08);
    expect(tops.esceptico - tops.cientifica).toBeGreaterThan(0.3);
  });

  it('keeps within the budget of a detailed character (12,000 triangles), frost included', () => {
    for (const who of ABSENT_WHO) {
      expect(rigs[who].triangles).toBeGreaterThan(6000);
      expect(rigs[who].triangles).toBeLessThanOrEqual(12000);
    }
  });

  it('reads apart in silhouette: her narrow shoulders and wide hips, his broad shoulders and narrow hips', () => {
    const measure = (who: AbsentWho) => {
      const rig = rigs[who];
      rig.setPose(absentPose(who, 'standing', 0));
      const j = ABSENT_SKELETONS[who].joints;
      const trunk = worldPoints(meshesOf(rig, ['pelvis', 'spine', 'thighL', 'thighR']));
      const top = worldPoints(meshesOf(rig, ['chest', 'upperArmL', 'upperArmR']));
      const shoulders = halfWidth(top, j.shoulder[2] - 0.12, j.shoulder[2] + 0.1);
      const hips = halfWidth(trunk, j.hip[2] - 0.12, j.hip[2] + 0.08);
      const waist = halfWidth(
        worldPoints(meshesOf(rig, ['spine'])),
        j.spine[2] + 0.04,
        j.spine[2] + 0.1,
      );
      return { shoulders, hips, waist };
    };
    const her = measure('cientifica');
    const him = measure('esceptico');
    expect(her.hips / her.shoulders).toBeGreaterThan(0.85);
    expect(him.hips / him.shoulders).toBeLessThan(0.62);
    expect(her.waist / her.hips).toBeLessThan(0.55);
    expect(him.shoulders).toBeGreaterThan(her.shoulders * 1.6);
  });

  it('faces −Z like the explorer: the feet and the sign point forward', () => {
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      rig.setPose(absentPose(who, 'standing', 0));
      const foot = boxOf(rig.bones.footR);
      expect(foot.min.z).toBeLessThan(-0.15);
      const sign = rig.root.getObjectByName(`AUSENTE_${who}_chest_sign`);
      expect(sign).toBeDefined();
      if (sign) expect(boxOf(sign).getCenter(new Vector3()).z).toBeLessThan(-0.1);
    }
  });

  it('has a head of dark glass with no face, and a sign of its own on the chest', () => {
    for (const who of ABSENT_WHO) {
      const head = rigs[who].bones.head;
      const kinds = ownMeshes(head).map((c) => c.name.split('_').pop());
      expect(kinds).toContain('glass');
      expect(kinds).toContain('glow');
      expect(kinds).not.toContain('ceramic');
    }
    const sign = (who: AbsentWho): number =>
      (rigs[who].root.getObjectByName(`AUSENTE_${who}_chest_sign`) as Mesh).geometry.getAttribute(
        'position',
      ).count;
    expect(sign('cientifica')).not.toBe(sign('esceptico'));
  });

  it('dresses her in a long robe and a mantle, and him in a work vest and an apron', () => {
    const clothOn = (who: AbsentWho): AbsentBone[] =>
      (Object.keys(rigs[who].bones) as AbsentBone[]).filter((bone) =>
        ownMeshes(rigs[who].bones[bone]).some((m) => m.name.endsWith('_cloth')),
      );
    expect(clothOn('cientifica')).toEqual(
      expect.arrayContaining(['pelvis', 'thighL', 'thighR', 'shinL', 'shinR', 'chest']),
    );
    expect(clothOn('esceptico')).toEqual(
      expect.arrayContaining(['pelvis', 'thighL', 'thighR', 'chest']),
    );
    // La túnica de ella llega casi al suelo; el delantal de él, por encima de la rodilla.
    const hem = (who: AbsentWho): number => {
      const rig = rigs[who];
      rig.setPose(absentPose(who, 'standing', 0));
      const cloth = meshesOf(rig, ['shinR', 'thighR']).filter((m) => m.name.endsWith('_cloth'));
      return Math.min(...worldPoints(cloth).map((p) => p.y));
    };
    expect(hem('cientifica')).toBeLessThan(0.3);
    expect(hem('esceptico')).toBeGreaterThan(ABSENT_SKELETONS.esceptico.joints.knee[2]);
  });

  it('wears golden rings at the neck, wrists and ankles, and around the head', () => {
    for (const who of ABSENT_WHO) {
      for (const bone of ['neck', 'forearmR', 'shinL', 'head'] as const) {
        const kinds = ownMeshes(rigs[who].bones[bone]).map((m) => m.name.split('_').pop());
        expect(kinds, `${who} ${bone}`).toContain('metal');
      }
    }
  });

  it('floats the head rings clear of the glass, below its lights at the front', () => {
    for (const who of ABSENT_WHO) {
      const rig = buildAbsent(who); // en reposo: el marco del cuerpo es el de diseño girado
      const head = ABSENT_SHAPES[who].head;
      const design = (p: Vector3): Vector3 => new Vector3(p.x, -p.z, p.y);
      const rings = worldPoints(
        ownMeshes(rig.bones.head).filter((m) => m.name.endsWith('_metal')),
      ).map(design);
      expect(rings.length).toBeGreaterThan(0);
      const margin = 0.012;
      for (const p of rings) {
        const s = sectionAt(head, p.z);
        const inRange = p.z > (head[0]?.z ?? 0) && p.z < (head[head.length - 1]?.z ?? 0);
        const depth = (p.y >= s.y ? s.front : s.back) + margin;
        const inside = ((p.x - s.x) / (s.rx + margin)) ** 2 + ((p.y - s.y) / depth) ** 2 < 1;
        expect(inRange && inside, `${who} ring touches the glass at ${p.toArray().join(',')}`).toBe(
          false,
        );
      }
      const lights = worldPoints(
        ownMeshes(rig.bones.head).filter((m) => m.name.endsWith('_glow')),
      ).map(design);
      const front = (p: Vector3): boolean => p.y > 0.05 && Math.abs(p.x) < 0.06;
      const lowestLight = Math.min(...lights.filter(front).map((p) => p.z));
      const ringFront = rings.filter(front).map((p) => p.z);
      for (const z of ringFront) expect(z).toBeLessThan(lowestLight - 0.05);
      rig.dispose();
    }
  });

  it('sits with the thighs on the seat and the feet on the floor', () => {
    for (const who of ABSENT_WHO) {
      for (const [name, seat] of [
        ['seated', DEFAULT_SEAT.seated],
        ['slumped', DEFAULT_SEAT.slumped],
      ] as const) {
        const rig = rigs[who];
        rig.setPose(absentPose(who, name, 0));
        rig.root.updateMatrixWorld(true);
        const hip = new Vector3().setFromMatrixPosition(rig.bones.thighR.matrixWorld);
        // Lo que apoya es lo de debajo del muslo junto a la cadera (con un margen por las facetas).
        const under = worldPoints(ownMeshes(rig.bones.thighR)).filter(
          (p) => Math.abs(p.z - hip.z) < 0.3,
        );
        const lowest = Math.min(...under.map((p) => p.y));
        expect(lowest, `${who} ${name}`).toBeGreaterThan(seat - 0.04);
        expect(lowest, `${who} ${name}`).toBeLessThan(seat + 0.03);
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

  it('frosts over when frozen, clothes and gold included, and thaws back', () => {
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      const { ceramic, cloth, metal } = rig.materials;
      rig.setPose(absentPose(who, 'standing', 0));
      const warm = ceramic.color.clone();
      const dry = cloth.color.clone();
      const lit = glowOf(rig);
      const frost = rig.root.getObjectByName(`AUSENTE_${who}_head_frost`);
      expect(frost?.visible).toBe(false);
      rig.setPose(absentPose(who, 'frozen', 0));
      expect(frost?.visible).toBe(true);
      expect(ceramic.color.b).toBeGreaterThan(ceramic.color.r); // azulado
      expect(ceramic.roughness).toBeGreaterThan(0.9); // mate
      expect(cloth.color.b).toBeGreaterThan(cloth.color.r);
      expect(metal.roughness).toBeGreaterThan(0.6);
      expect(glowOf(rig)).toBeLessThan(lit);
      rig.setPose(absentPose(who, 'standing', 0));
      expect(ceramic.color.equals(warm)).toBe(true);
      expect(cloth.color.equals(dry)).toBe(true);
      expect(frost?.visible).toBe(false);
    }
  });

  it('is smooth, not faceted: ceramic, cloth, metal and glass are shaded smooth', () => {
    for (const who of ABSENT_WHO) {
      const { ceramic, cloth, metal, glass } = rigs[who].materials;
      for (const material of [ceramic, cloth, metal, glass])
        expect(material.flatShading).toBe(false);
    }
  });

  it('breathes with the chest and sets every pose without losing a bone', () => {
    for (const who of ABSENT_WHO) {
      const rig = rigs[who];
      for (const name of ABSENT_POSE_NAMES) {
        for (const t of [0, 1.7, 4.2]) {
          rig.setPose(absentPose(who, name, t));
          rig.root.updateMatrixWorld(true);
          for (const bone of Object.values(rig.bones)) {
            const at = new Vector3().setFromMatrixPosition(bone.matrixWorld);
            expect(Number.isFinite(at.x + at.y + at.z)).toBe(true);
          }
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
