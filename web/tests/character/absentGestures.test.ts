import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { NEUTRAL_GESTURE, PALM_SHARE, seatedGesture } from '../../src/character/absentGestures';
import { CUP_PALMS_GAP, gripTwist, palmGap } from '../../src/character/absentGrip';
import { buildAbsent } from '../../src/character/absentModel';
import { absentPose, armChain, legChain, type AbsentWho } from '../../src/character/absentPoses';
import { ABSENT_SKELETONS } from '../../src/character/absentSkeleton';

const WHO: readonly AbsentWho[] = ['cientifica', 'esceptico'];
/** Lo ancho de la taza del Mirador (worlds/procedural/umbral.ts: radio 0,06). */
const CUP_WIDTH = 0.12;

function allFinite(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allFinite);
  if (value && typeof value === 'object') return Object.values(value).every(allFinite);
  return true;
}

describe('gestos sentados', () => {
  it('sin gesto es la pose sentada de siempre', () => {
    for (const who of WHO) {
      expect(seatedGesture(who, 3.2, NEUTRAL_GESTURE)).toEqual(absentPose(who, 'seated', 3.2));
    }
  });

  it('mirar, alzar la vista, ladear la cabeza e inclinarse', () => {
    const base = absentPose('cientifica', 'seated', 1);
    const pose = seatedGesture('cientifica', 1, {
      ...NEUTRAL_GESTURE,
      look: -0.3,
      lift: 0.4,
      tilt: -0.15,
      lean: -0.05,
    });
    expect(pose.headYaw).toBeCloseTo(-0.3);
    expect(pose.chestYaw).toBeLessThan(base.chestYaw);
    expect(pose.headPitch + pose.neckPitch).toBeCloseTo(base.headPitch + base.neckPitch + 0.4);
    expect(pose.headRoll).toBeLessThan(base.headRoll);
    expect(pose.spineRoll).toBeLessThan(base.spineRoll);
  });

  it('los gestos tienen tope: nadie se parte el cuello', () => {
    const pose = seatedGesture('esceptico', 0, {
      ...NEUTRAL_GESTURE,
      look: 4,
      lift: 9,
      tilt: -3,
      lean: 2,
      glow: 5,
    });
    expect(pose.headYaw).toBeLessThanOrEqual(0.6);
    expect(pose.headRoll).toBeGreaterThanOrEqual(-0.35 - 0.05);
    expect(pose.spineRoll).toBeLessThanOrEqual(0.15 + 0.05);
    expect(pose.sign).toBeLessThanOrEqual(1);
    expect(allFinite(pose)).toBe(true);
    expect(
      allFinite(seatedGesture('esceptico', Number.NaN, { ...NEUTRAL_GESTURE, look: Number.NaN })),
    ).toBe(true);
  });

  it('sostener la taza sube las manos sobre el regazo y las lleva hacia el centro', () => {
    for (const who of WHO) {
      const resting = seatedGesture(who, 2, NEUTRAL_GESTURE);
      const holding = seatedGesture(who, 2, { ...NEUTRAL_GESTURE, hold: 1 });
      const lap = legChain(who, holding, 1);
      const wrist = armChain(who, holding, 1).wrist;
      expect(wrist.z).toBeGreaterThan(armChain(who, resting, 1).wrist.z);
      expect(wrist.z).toBeGreaterThan(lap.hip.z);
      expect(wrist.y).toBeGreaterThan(lap.hip.y);
      expect(wrist.y).toBeLessThan(lap.knee.y);
      expect(holding.arms[1].twist).toBeGreaterThan(resting.arms[1].twist);
      // A medio gesto, a medio camino.
      const half = seatedGesture(who, 2, { ...NEUTRAL_GESTURE, hold: 0.5 });
      expect(half.arms[1].twist).toBeGreaterThan(resting.arms[1].twist);
      expect(half.arms[1].twist).toBeLessThan(holding.arms[1].twist);
    }
  });

  it('con el giro medido en el muñeco, las dos palmas abrazan la taza: entre ellas cabe y poco más', () => {
    for (const who of WHO) {
      const rig = buildAbsent(who);
      const grip = gripTwist(rig);
      const hold = { ...NEUTRAL_GESTURE, hold: 1 };
      // También al respirar y con la taza a medio girar.
      for (const [time, turn] of [
        [2, 0],
        [5.5, 1.3],
      ] as const) {
        rig.setPose(seatedGesture(who, time, { ...hold, turn }, { grip }));
        const gap = palmGap(rig);
        expect(gap, who).toBeGreaterThan(CUP_WIDTH);
        expect(gap, who).toBeLessThan(CUP_PALMS_GAP + 0.03);
      }
      // Delante del cuerpo (el frente es −Z) y a la misma altura las dos.
      rig.setPose(seatedGesture(who, 2, hold, { grip }));
      rig.root.updateMatrixWorld(true);
      const reach = -ABSENT_SKELETONS[who].handLength * PALM_SHARE;
      const left = rig.bones.handL.localToWorld(new Vector3(0, reach, 0));
      const right = rig.bones.handR.localToWorld(new Vector3(0, reach, 0));
      expect(left.z).toBeLessThan(-0.05);
      expect(Math.abs(left.y - right.y)).toBeLessThan(0.01);
    }
  });

  it('al girar la taza las muñecas se mueven en sentidos opuestos, solo si la sostiene', () => {
    const still = seatedGesture('esceptico', 2, { ...NEUTRAL_GESTURE, hold: 1 });
    const turning = seatedGesture('esceptico', 2, { ...NEUTRAL_GESTURE, hold: 1, turn: 1.2 });
    const left = turning.arms[0].twist - still.arms[0].twist;
    const right = turning.arms[1].twist - still.arms[1].twist;
    expect(left).toBeGreaterThan(0);
    expect(right).toBeCloseTo(-left);
    expect(seatedGesture('esceptico', 2, { ...NEUTRAL_GESTURE, turn: 1.2 }).arms).toEqual(
      seatedGesture('esceptico', 2, NEUTRAL_GESTURE).arms,
    );
  });
});
