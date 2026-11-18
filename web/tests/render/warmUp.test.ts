import {
  Camera,
  Group,
  PerspectiveCamera,
  Scene,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { describe, expect, it } from 'vitest';
import { warmUpShaders } from '../../src/render/warmUp';

/** Un renderer de mentira que apunta a qué destino estaba puesto cuando se pidió compilar. */
function fakeRenderer() {
  let current: WebGLRenderTarget | null = null;
  const compiledInto: (WebGLRenderTarget | null)[] = [];
  const renderer = {
    getRenderTarget: () => current,
    setRenderTarget: (target: WebGLRenderTarget | null) => {
      current = target;
    },
    compileAsync: (): Promise<void> => {
      compiledInto.push(current);
      return Promise.resolve();
    },
  };
  return { renderer: renderer as unknown as WebGLRenderer, compiledInto, current: () => current };
}

describe('warmUpShaders', () => {
  it('compila también la variante para dibujar en una textura (el pase de fondo de los gusanos)', async () => {
    const scene = new Scene();
    scene.add(new Group());
    const { renderer, compiledInto } = fakeRenderer();

    await warmUpShaders(renderer, scene, new PerspectiveCamera());

    // Una pasada por cada parte, la escena entera en pantalla y, al final, la escena entera en una textura.
    expect(compiledInto.length).toBeGreaterThanOrEqual(3);
    expect(compiledInto.slice(0, -1).every((target) => target === null)).toBe(true);
    expect(compiledInto.at(-1)).not.toBeNull();
  });

  it('devuelve el destino de dibujo a como estaba y avisa del progreso hasta el final', async () => {
    const scene = new Scene();
    const { renderer, current } = fakeRenderer();
    const steps: [number, number][] = [];

    await warmUpShaders(renderer, scene, new Camera(), (done, total) => steps.push([done, total]));

    expect(current()).toBeNull();
    expect(steps.at(-1)).toEqual([steps.at(-1)?.[1], steps.at(-1)?.[1]]);
    expect(steps.every(([done, total]) => done <= total)).toBe(true);
  });
});
