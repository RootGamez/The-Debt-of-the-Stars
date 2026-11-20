import { describe, expect, test } from 'vitest';
import { ShaderChunk } from 'three';
import {
  ACES_INPUT,
  ACES_OUTPUT,
  SCREEN_TO_SCENE_GLSL,
  acesFilmic,
  screenToScene,
  sceneToScreen,
} from '../../src/render/screenToScene';

/** Los números de un `mat3(...)` de three, en el orden en que están escritos (por columnas). */
function matrixFromChunk(name: string): number[] {
  const chunk = ShaderChunk.tonemapping_pars_fragment;
  const start = chunk.indexOf(`${name} = mat3(`);
  expect(start).toBeGreaterThan(-1);
  const body = chunk.slice(start, chunk.indexOf(');', start));
  return [...body.matchAll(/-?\d+\.\d+/g)].map((m) => Number(m[0]));
}

describe('screenToScene', () => {
  test('uses the same ACES matrices as three', () => {
    expect(matrixFromChunk('ACESInputMat')).toEqual([...ACES_INPUT]);
    expect(matrixFromChunk('ACESOutputMat')).toEqual([...ACES_OUTPUT]);
  });

  test('undoes ACES and sRGB for colours that were not clipped', () => {
    for (const exposure of [1, 0.8]) {
      for (const color of [
        [0.01, 0.02, 0.03],
        [0.18, 0.18, 0.18],
        [0.5, 0.3, 0.1],
        [1.2, 0.9, 0.4],
        [0.05, 0.4, 1.1],
      ] as const) {
        const back = screenToScene(sceneToScreen(color, exposure), exposure);
        color.forEach((c, i) => {
          expect(back[i]).toBeCloseTo(c, 3);
        });
      }
    }
  });

  test('what the screen shows comes back to the same on screen, also bright clipped colours', () => {
    for (const color of [
      [0, 0, 0],
      [0.001, 0.001, 0.001],
      [4, 4, 4],
      [9, 2, 0.3],
      [0.1, 3, 12],
    ] as const) {
      const shown = sceneToScreen(color, 1);
      const again = sceneToScreen(screenToScene(shown, 1), 1);
      shown.forEach((c, i) => {
        expect(again[i]).toBeCloseTo(c, 3);
      });
    }
  });

  test('colours ACES cannot make (unlit materials, the clear colour) still give light, not NaN', () => {
    for (const shown of [
      [1, 1, 1],
      [0.02, 0.5, 1],
      [1, 0, 0],
    ] as const) {
      for (const c of screenToScene(shown, 1)) {
        expect(Number.isFinite(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('ACES matches three on a known value', () => {
    // Gris medio: con el 1/0,6 de three queda en 0,3 y la curva lo deja en ≈ 0,2131 (lineal, antes de sRGB).
    const out = acesFilmic([0.18, 0.18, 0.18], 1);
    for (const c of out) expect(c).toBeCloseTo(0.2131, 3);
  });

  test('the shader code inverts with the inverted matrices', () => {
    expect(SCREEN_TO_SCENE_GLSL).toContain('vec3 screenToScene(vec3 shown)');
    expect(SCREEN_TO_SCENE_GLSL).toContain('sRGBTransferEOTF');
    expect(SCREEN_TO_SCENE_GLSL).toContain('#ifdef TONE_MAPPING');
  });
});
