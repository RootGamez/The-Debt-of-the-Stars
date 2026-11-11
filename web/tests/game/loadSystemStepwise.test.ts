import { describe, expect, it } from 'vitest';
import { loadSystemStepwise } from '../../src/game/loadSystem';

describe('loadSystemStepwise', () => {
  it('builds every world of the system one at a time, saying how many are done', async () => {
    const steps: [number, number][] = [];
    const pauses: number[] = [];
    const system = await loadSystemStepwise('puertas', [], {
      onWorld: (built, total) => steps.push([built, total]),
      pause: () => {
        pauses.push(steps.length);
        return Promise.resolve();
      },
    });
    expect([...system.runtimes.keys()]).toEqual(['puertas']);
    expect(system.startWorld).toBe('puertas');
    expect(steps).toEqual([
      [0, 1],
      [1, 1],
    ]);
    // Se respira antes de cada mundo, no después de terminar.
    expect(pauses).toEqual([1]);
  });

  it('fails like loadSystem when the world does not exist', async () => {
    await expect(loadSystemStepwise('no-existe')).rejects.toThrow('no-existe');
  });
});
