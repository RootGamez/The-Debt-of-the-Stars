// El explorador montado: mide lo que un Ool adulto, cabe en la cápsula del jugador, está de pie sobre sus botas,
// mira hacia −Z y en primera persona esconde la cabeza y el casco.
import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { EYE_Z } from '../../src/character/explorerGear';
import { buildExplorer, EXPLORER_AGE } from '../../src/character/explorerModel';
import { createGait, gaitPose, stepGait } from '../../src/character/gait';
import { EYE_HEIGHT, PLAYER_HEIGHT, WALK_SPEED } from '../../src/data/movement';
import { oolHeight } from '../../src/worlds/procedural/ool';

const rig = buildExplorer();
const box = (): Box3 => {
  rig.root.updateMatrixWorld(true);
  return new Box3().setFromObject(rig.root);
};

describe('the explorer model', () => {
  it('is as tall as the other Ool, helmet aside, and fits in the player capsule', () => {
    rig.setFirstPerson(false);
    const whole = box();
    rig.bones.helmet.visible = false;
    const body = new Box3();
    rig.root.updateMatrixWorld(true);
    rig.root.traverseVisible((o) => {
      if (o !== rig.root && o.children.length === 0) body.expandByObject(o);
    });
    rig.bones.helmet.visible = true;
    expect(body.max.y).toBeGreaterThan(oolHeight(EXPLORER_AGE) - 0.08);
    expect(body.max.y).toBeLessThan(oolHeight(EXPLORER_AGE) + 0.08);
    expect(whole.max.y).toBeLessThan(PLAYER_HEIGHT);
    expect(whole.min.y).toBeGreaterThan(-0.01);
    expect(whole.min.y).toBeLessThan(0.02);
  });

  it('has its eyes at the height of the camera', () => {
    expect(Math.abs(EYE_HEIGHT - EYE_Z)).toBeLessThan(0.05);
  });

  it('faces −Z: the boots and the face point forward, the backpack behind', () => {
    const toes = new Box3().setFromObject(rig.bones.footL);
    const pack = new Box3().setFromObject(rig.bones.pack);
    expect(toes.min.z).toBeLessThan(-0.15);
    expect(pack.max.z).toBeGreaterThan(0.45);
  });

  it('stays within a sensible triangle budget for the one character always on screen', () => {
    expect(rig.triangles).toBeGreaterThan(3000); // detallado
    expect(rig.triangles).toBeLessThan(20000);
  });

  it('hides the head and the helmet in first person, never the body', () => {
    rig.setFirstPerson(true);
    expect(rig.bones.head.visible).toBe(false);
    expect(rig.bones.helmet.visible).toBe(false);
    expect(rig.bones.torso.visible).toBe(true);
    expect(rig.bones.footL.visible).toBe(true);
    rig.setFirstPerson(false);
    expect(rig.bones.helmet.visible).toBe(true);
  });

  it('keeps a boot on the ground while it walks', () => {
    const gait = createGait();
    const ankle = new Vector3();
    for (let k = 0; k < 90; k++) {
      stepGait(gait, {
        dt: 1 / 60,
        speed: WALK_SPEED,
        forward: 1,
        grounded: true,
        swimming: false,
        verticalSpeed: 0,
        turnRate: 0,
        landings: 0,
        landingSpeed: 0,
      });
      rig.setPose(gaitPose(gait, 0), 1);
      rig.root.updateMatrixWorld(true);
      const lowest = Math.min(
        ...[rig.bones.footL, rig.bones.footR].map(
          (f) => ankle.setFromMatrixPosition(f.matrixWorld).y,
        ),
      );
      expect(lowest).toBeCloseTo(0.085, 2);
    }
  });
});
