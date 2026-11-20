// Llevar algo en brazos: las palmas tocan los costados del objeto, que va delante del pecho y por debajo de los ojos.
import { describe, expect, it } from 'vitest';
import { carryGrip, chestFront, palmOf } from '../../src/character/carryPose';
import { JOINTS } from '../../src/character/explorerBody';
import { EYE_HEIGHT } from '../../src/data/movement';

const SIZES = {
  campana: { width: 0.16, height: 0.2, depth: 0.16 },
  pesa: { width: 0.12, height: 0.12, depth: 0.12 },
  prisma: { width: 0.25, height: 0.3, depth: 0.2 },
  contrapeso: { width: 0.6, height: 0.7, depth: 0.45 },
};
/** Del torso al suelo del muñeco (marco del torso: Y arriba, frente −Z). */
const TORSO_Z = JOINTS.torso[2];

describe('carrying something in the arms', () => {
  it.each(Object.entries(SIZES))('puts both palms on the sides of the %s', (_, size) => {
    const grip = carryGrip(size);
    expect(grip.miss).toBeLessThan(0.04);
    const [left, right] = grip.palms;
    expect(left[0]).toBeLessThan(0);
    expect(right[0]).toBeGreaterThan(0);
    // Las dos manos a la misma altura y a la misma distancia del pecho (simétricas).
    expect(left[1]).toBeCloseTo(right[1], 2);
    expect(left[2]).toBeCloseTo(right[2], 2);
  });

  it('holds it in front of the chest, never inside it', () => {
    for (const size of Object.values(SIZES)) {
      const grip = carryGrip(size);
      const [, y, z] = grip.center;
      const back = -z - size.depth / 2;
      expect(back).toBeGreaterThanOrEqual(chestFront(0, y + TORSO_Z) - 1e-6);
    }
  });

  it('keeps its top below the eyes, so first person still sees ahead', () => {
    for (const size of Object.values(SIZES)) {
      const top = carryGrip(size).center[1] + TORSO_Z + size.height / 2;
      expect(top).toBeLessThan(EYE_HEIGHT);
    }
  });

  it('holds small things higher than big ones', () => {
    expect(carryGrip(SIZES.pesa).center[1]).toBeGreaterThan(carryGrip(SIZES.contrapeso).center[1]);
  });

  it('gives the same pose for the same size (and mirrors left and right)', () => {
    const a = carryGrip(SIZES.prisma);
    const b = carryGrip(SIZES.prisma);
    expect(a).toEqual(b);
    expect(a.arms[0].shoulder).toBeCloseTo(a.arms[1].shoulder, 3);
    expect(a.arms[0].shoulderRoll).toBeCloseTo(a.arms[1].shoulderRoll, 3);
  });

  it('measures the arm the way the puppet bends it', () => {
    // Brazo colgando: la palma, por debajo y fuera del hombro.
    const rest = palmOf({ shoulder: 0, shoulderRoll: 0, elbow: 0, wrist: 0 }, 1);
    expect(rest.x).toBeGreaterThan(0.3);
    expect(rest.y).toBeLessThan(0);
    // Hombro hacia delante: la palma va al frente (−Z).
    const forward = palmOf({ shoulder: 1.4, shoulderRoll: 0, elbow: 0, wrist: 0 }, 1);
    expect(forward.z).toBeLessThan(-0.3);
  });
});
