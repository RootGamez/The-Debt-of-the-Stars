// Lo que se ve al tocar el agua (Fase 11E): gotas, ondas y burbujas, y cuándo salen al jugar.
import { describe, expect, it } from 'vitest';
import {
  Color,
  MeshStandardMaterial,
  Vector3,
  type Points,
  type ShaderMaterial,
  type WebGLRenderer,
} from 'three';
import { createWaterPlay } from '../../src/game/waterPlay';
import type { WaterBody } from '../../src/physics/water';
import { createWaves } from '../../src/physics/waves';
import { applyUnderwater, oceanMaterial, oceanMesh } from '../../src/render/ocean';
import { createWaterEffects } from '../../src/render/waterEffects';
import { seededRandom } from '../../src/worlds/procedural/noise';

const SEA = 70;
const water: WaterBody = { center: new Vector3(), level: SEA };
const UP = new Vector3(0, 1, 0);
const AT_SURFACE = new Vector3(0, SEA, 0);

function steps(seconds: number, each: (dt: number) => void): void {
  for (let t = 0; t < seconds; t += 1 / 60) each(1 / 60);
}

describe('the water effects', () => {
  it('throws drops that fall back into the sea and leave rings behind', () => {
    const effects = createWaterEffects(seededRandom(1));
    effects.splash(AT_SURFACE, UP, 1);
    const start = effects.snapshot();
    expect(start.particles).toBeGreaterThan(30);
    expect(start.ripples).toBeGreaterThan(0);
    // Lo que se mueve es lo que se dibuja: las gotas vivas se ven en el atributo de la malla.
    effects.update(0.05, water);
    const drops = effects.object.getObjectByName('EfectosAgua_Gotas') as Points;
    const alpha = drops.geometry.getAttribute('aAlpha');
    const position = drops.geometry.getAttribute('position');
    expect(Array.from({ length: alpha.count }, (_, i) => alpha.getX(i)).some((x) => x > 0.5)).toBe(
      true,
    );
    expect(position.getY(0)).toBeGreaterThan(SEA);

    steps(3, (dt) => {
      effects.update(dt, water);
    });

    expect(effects.snapshot()).toEqual({ particles: 0, ripples: 0 });
  });

  it('lets bubbles rise until they break at the surface', () => {
    const effects = createWaterEffects(seededRandom(2));
    effects.bubbles(new Vector3(0, SEA - 3, 0), UP, 5);
    expect(effects.snapshot().particles).toBe(5);

    steps(1, (dt) => {
      effects.update(dt, water);
    });
    expect(effects.snapshot().particles).toBe(5);
    steps(4, (dt) => {
      effects.update(dt, water);
    });
    expect(effects.snapshot().particles).toBe(0);
  });

  it('keeps a ripple on the moving surface and lets it fade', () => {
    const effects = createWaterEffects(seededRandom(3));
    const wavy: WaterBody = { ...water, waves: createWaves(0.5, 3) };
    effects.ripple(AT_SURFACE, UP, 2);
    effects.update(0.1, wavy);
    const ring = effects.object.children.find((c) => c.visible && c.type === 'Mesh');
    expect(ring?.position.length()).toBeGreaterThan(SEA - 0.6);
    expect(ring?.position.length()).toBeLessThan(SEA + 0.6);

    steps(3, (dt) => {
      effects.update(dt, wavy);
    });
    expect(effects.snapshot().ripples).toBe(0);
  });

  it('reuses its pieces instead of growing without end', () => {
    const effects = createWaterEffects(seededRandom(4));
    for (let i = 0; i < 40; i++) effects.splash(AT_SURFACE, UP, 1.5);
    expect(effects.snapshot().particles).toBeLessThanOrEqual(480);
    expect(effects.snapshot().ripples).toBeLessThanOrEqual(28);
    effects.clear();
    expect(effects.snapshot()).toEqual({ particles: 0, ripples: 0 });
  });
});

describe('when the water splashes', () => {
  const fall = (from: number, speed: number) => {
    const effects = createWaterEffects(seededRandom(5));
    const play = createWaterPlay(effects, seededRandom(6));
    const position = new Vector3(0, from, 0);
    for (let i = 0; i < 40; i++) {
      play.update(water, { position, up: UP, ship: false }, 1 / 60);
      position.y -= speed / 60;
    }
    return effects.snapshot();
  };

  it('splashes when you fall in, and not when you walk in slowly', () => {
    expect(fall(SEA + 0.5, 6).particles).toBeGreaterThan(20);
    expect(fall(SEA + 0.2, 0.5).particles).toBe(0);
  });

  it('leaves rings while you swim along the surface and bubbles while you dive', () => {
    const effects = createWaterEffects(seededRandom(7));
    const play = createWaterPlay(effects, seededRandom(8));
    const position = new Vector3(0, SEA - 1.2, 0);
    for (let i = 0; i < 30; i++) {
      position.x += 2 / 60;
      play.update(water, { position, up: UP, ship: false }, 1 / 60);
    }
    expect(effects.snapshot().ripples).toBeGreaterThan(0);

    effects.clear();
    position.y = SEA - 5;
    for (let i = 0; i < 120; i++) play.update(water, { position, up: UP, ship: false }, 1 / 60);
    expect(effects.snapshot().particles).toBeGreaterThan(0);
  });

  it('forgets everything without a sea', () => {
    const effects = createWaterEffects(seededRandom(9));
    const play = createWaterPlay(effects);
    play.update(undefined, { position: new Vector3(0, SEA - 5, 0), up: UP, ship: false }, 1 / 60);
    expect(effects.snapshot()).toEqual({ particles: 0, ripples: 0 });
  });
});

describe('the ocean material', () => {
  const spec = {
    name: 'mar',
    level: SEA,
    waves: createWaves(0.4, 2),
    sun: new Vector3(1, 0, 0),
    colors: {
      deep: new Color('#1c6c8f'),
      shallow: new Color('#53b9d2'),
      foam: new Color('#ffffff'),
      sky: new Color('#2f6fc0'),
      horizon: new Color('#b4d6ee'),
      under: new Color('#2a8aa3'),
    },
    haze: [30, 100] as const,
    opacity: 0.6,
  };

  it('moves the surface with the very waves of the physics', () => {
    const material = oceanMaterial(spec);
    expect(material.uniforms.uWaveA?.value).toEqual(spec.waves.map((w) => w.amplitude));
    expect(material.vertexShader).toContain(`#define WAVES ${String(spec.waves.length)}`);
    expect(material.transparent).toBe(true);
  });

  it('needs at least one wave', () => {
    expect(() => oceanMesh(new MeshStandardMaterial() as never, { ...spec, waves: [] })).toThrow();
  });

  it('tints what is under the sea on top of the material it already has', () => {
    const material = new MeshStandardMaterial();
    let before = 0;
    material.onBeforeCompile = () => {
      before++;
    };
    applyUnderwater(material, { level: SEA, sun: UP, tint: new Color('#2b7d97') });
    const shader = {
      uniforms: {},
      vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <tonemapping_fragment>',
    } as unknown as Parameters<MeshStandardMaterial['onBeforeCompile']>[0];
    material.onBeforeCompile(shader, {} as WebGLRenderer);

    expect(before).toBe(1);
    expect(shader.fragmentShader).toContain('uwDepth');
    expect(material.customProgramCacheKey()).toContain('underwater');
    expect((shader as unknown as ShaderMaterial).uniforms.uUwLevel?.value).toBe(SEA);
  });
});
