import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { createWorldRuntime, environmentOf } from '../../src/worlds/worldRuntime';
import { loadBuiltWorld } from '../helpers/builtWorlds';

describe('createWorldRuntime', () => {
  it.each(['umbral', 'archivo', 'taller', 'cicatriz', 'observatorio'])(
    'prepares %s with its gravity, ground and spawn point in its own frame',
    async (id) => {
      const runtime = createWorldRuntime(await loadBuiltWorld(id));

      expect(runtime.id).toBe(id);
      expect(runtime.well.center.length()).toBe(0);
      expect(runtime.well.radius).toBe(runtime.world.info.radius);
      // Los pies empiezan sobre la superficie (la malla es una esfera irregular de ruido suave).
      expect(runtime.spawn.feet.length()).toBeGreaterThan(runtime.world.info.radius * 0.8);
      expect(runtime.spawn.feet.length()).toBeLessThan(runtime.world.info.radius * 1.3);
    },
  );

  it('gives the motor the well and the collisions of that world only', async () => {
    const runtime = createWorldRuntime(await loadBuiltWorld('umbral'));

    const env = environmentOf(runtime);

    expect(env.wells).toEqual([runtime.well]);
    expect(env.world).toBe(runtime.collision);
  });

  it('refuses a world already hung from a pivot (its positions must come from the model)', async () => {
    const world = await loadBuiltWorld('umbral');
    new Group().add(world.scene);

    expect(() => createWorldRuntime(world)).toThrow(/pivote|colgado/);
  });
});
