import { describe, expect, it } from 'vitest';
import { Box3, MeshStandardMaterial, Vector3 } from 'three';
import { buildOolRig } from '../../src/character/oolRig';
import { lookUpPose, pointUpPose, REST_POSE } from '../../src/character/oolPoses';
import { buildOol, oolHeight, type OolSpec } from '../../src/worlds/procedural/ool';

const materials = { body: new MeshStandardMaterial({ vertexColors: true }) };
const maestra: OolSpec = { id: 'maestra', age: 0.85, outfit: 'maestra', seed: 11 };

function boxOf(object: Parameters<Box3['setFromObject']>[0]): Box3 {
  object.updateMatrixWorld(true);
  return new Box3().setFromObject(object);
}

describe('an articulated Ool for the scenes (F4)', () => {
  it('is the same Ool as the one of the world, cut at its joints', () => {
    const rig = buildOolRig(maestra, materials);
    rig.setPose(REST_POSE);
    const whole = boxOf(buildOol(maestra, materials));
    const parts = boxOf(rig.root);
    expect(parts.min.distanceTo(whole.min)).toBeLessThan(0.02);
    expect(parts.max.distanceTo(whole.max)).toBeLessThan(0.02);
    expect(rig.height).toBeCloseTo(oolHeight(maestra.age), 6);
    expect(rig.eye.y).toBeGreaterThan(rig.height * 0.7);
    expect(rig.eye.z).toBeLessThan(0);
    rig.dispose();
  });

  it('raises its eyes to the sky and its short right arm well above its shoulder', () => {
    const rig = buildOolRig(maestra, materials);
    const ahead = (pose: typeof REST_POSE): Vector3 => {
      rig.setPose(pose);
      rig.root.updateMatrixWorld(true);
      const forward = new Vector3(0, 0, -1).transformDirection(rig.joints.head.matrixWorld);
      return forward;
    };
    expect(ahead(REST_POSE).y).toBeCloseTo(0, 6);
    expect(ahead(lookUpPose()).y).toBeGreaterThan(0.6);

    rig.setPose(REST_POSE);
    const restTop = boxOf(rig.joints.armR).max.y;
    rig.setPose(pointUpPose());
    const shoulder = rig.joints.armR.getWorldPosition(new Vector3()).y;
    expect(boxOf(rig.joints.armR).max.y).toBeGreaterThan(shoulder + 0.25);
    expect(boxOf(rig.joints.armR).max.y).toBeGreaterThan(restTop + 0.2);
    rig.dispose();
  });

  it('turns on its feet without moving where it stands', () => {
    const rig = buildOolRig(maestra, materials);
    rig.root.position.set(2, 0, 3);
    rig.setPose({ ...REST_POSE, turn: Math.PI / 2 });
    const box = boxOf(rig.root);
    const center = box.getCenter(new Vector3());
    expect(Math.hypot(center.x - 2, center.z - 3)).toBeLessThan(0.15);
    expect(rig.root.position.toArray()).toEqual([2, 0, 3]);
    rig.dispose();
  });
});
