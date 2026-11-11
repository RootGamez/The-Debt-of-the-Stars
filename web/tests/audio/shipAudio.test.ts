import { describe, expect, it } from 'vitest';
import { createShipAudio, type ShipAudioFrame } from '../../src/audio/shipAudio';
import { THRUSTERS } from '../../src/ship/thrusters';

const COUNT = THRUSTERS.length;

function levels(on: Record<number, number> = {}): number[] {
  return Array.from({ length: COUNT }, (_, i) => on[i] ?? 0);
}

const IDLE: ShipAudioFrame = {
  dt: 1 / 60,
  piloting: true,
  landed: false,
  speed: 0,
  levels: levels(),
  hatch: 0,
  impact: 0,
  crashed: false,
};

/** Primer índice de una tobera de ese grupo (y, opcionalmente, del lado indicado). */
function thruster(group: string, side?: 'left' | 'right'): number {
  const found = THRUSTERS.findIndex(
    (t) =>
      t.group === group &&
      (side === undefined || (side === 'left' ? t.position.x < -0.1 : t.position.x > 0.1)),
  );
  if (found < 0) throw new Error(`No hay tobera ${group} ${side ?? ''}`);
  return found;
}

function idsOf(sounds: readonly { id: string }[]): string[] {
  return sounds.map((s) => s.id);
}

/** Una nave nueva ya en vuelo, con un fotograma de reposo para fijar el estado. */
function flying() {
  const audio = createShipAudio();
  audio.update(IDLE);
  return audio;
}

describe('the thruster loops', () => {
  it('are silent when no thruster fires', () => {
    const { loops, sounds } = flying().update(IDLE);

    expect(sounds).toEqual([]);
    expect(loops.main.level).toBe(0);
    expect(loops.retro.level).toBe(0);
    expect(loops.lift.level).toBe(0);
    expect(loops.rcs.level).toBe(0);
  });

  it('follow the strongest thruster of each group', () => {
    const main = thruster('main');
    const { loops } = flying().update({ ...IDLE, levels: levels({ [main]: 0.8 }) });

    expect(loops.main.level).toBeCloseTo(0.8);
    expect(loops.retro.level).toBe(0);
  });

  it('get higher pitched the harder the thrust', () => {
    const main = thruster('main');
    const soft = flying().update({ ...IDLE, levels: levels({ [main]: 0.2 }) }).loops.main.rate;
    const hard = flying().update({ ...IDLE, levels: levels({ [main]: 1 }) }).loops.main.rate;

    expect(hard).toBeGreaterThan(soft);
  });

  it('stay silent when nobody is flying the ship', () => {
    const main = thruster('main');
    const audio = createShipAudio();

    const { loops } = audio.update({ ...IDLE, piloting: false, levels: levels({ [main]: 1 }) });

    expect(loops.main.level).toBe(0);
  });
});

describe('the ignition of each thruster', () => {
  it('sounds once when a thruster lights up, and not while it stays on', () => {
    const audio = flying();
    const main = thruster('main', 'left');

    const first = audio.update({ ...IDLE, levels: levels({ [main]: 0.7 }) });
    const second = audio.update({ ...IDLE, levels: levels({ [main]: 0.7 }) });

    expect(idsOf(first.sounds)).toEqual(['thr.ignite']);
    expect(second.sounds).toEqual([]);
  });

  it('sounds again after the thruster went off and lit up again', () => {
    const audio = flying();
    const main = thruster('main', 'left');
    audio.update({ ...IDLE, levels: levels({ [main]: 0.7 }) });
    for (let i = 0; i < 30; i++) audio.update({ ...IDLE, levels: levels() });

    const again = audio.update({ ...IDLE, levels: levels({ [main]: 0.7 }) });

    expect(idsOf(again.sounds)).toEqual(['thr.ignite']);
  });

  it('does not machine-gun when the thrust trembles around the threshold', () => {
    const audio = flying();
    const main = thruster('main', 'left');
    let count = 0;

    for (let i = 0; i < 120; i++) {
      const level = i % 2 === 0 ? 0.12 : 0.2;
      count += audio.update({ ...IDLE, levels: levels({ [main]: level }) }).sounds.length;
    }

    expect(count).toBeLessThanOrEqual(1);
  });

  it('does not repeat the same thruster faster than a short minimum', () => {
    const audio = flying();
    const main = thruster('main', 'left');
    let count = 0;

    for (let i = 0; i < 12; i++) {
      count += audio.update({ ...IDLE, levels: levels({ [main]: 0.8 }) }).sounds.length;
      count += audio.update({ ...IDLE, levels: levels() }).sounds.length;
    }

    expect(count).toBeLessThanOrEqual(2);
  });

  it('puffs the maneuvering thrusters, each placed where it is on the hull', () => {
    const audio = flying();
    const left = thruster('rcs', 'left');
    const right = thruster('rcs', 'right');

    const { sounds } = audio.update({ ...IDLE, levels: levels({ [left]: 0.9, [right]: 0.9 }) });

    expect(idsOf(sounds)).toEqual(['thr.puff', 'thr.puff']);
    const pans = sounds.map((s) => s.options.pan ?? 0);
    expect(Math.min(...pans)).toBeLessThan(-0.3);
    expect(Math.max(...pans)).toBeGreaterThan(0.3);
  });

  it('places the left engine on the left and the right engine on the right', () => {
    const audio = flying();
    const { sounds } = audio.update({
      ...IDLE,
      levels: levels({ [thruster('main', 'left')]: 0.9, [thruster('main', 'right')]: 0.9 }),
    });

    const pans = sounds.map((s) => s.options.pan ?? 0).sort((a, b) => a - b);
    expect(pans[0]).toBeLessThan(0);
    expect(pans[1]).toBeGreaterThan(0);
  });

  it('is silent while nobody pilots', () => {
    const audio = createShipAudio();
    audio.update({ ...IDLE, piloting: false });

    const { sounds } = audio.update({
      ...IDLE,
      piloting: false,
      levels: levels({ [thruster('main')]: 1 }),
    });

    expect(sounds).toEqual([]);
  });
});

describe('the hatch', () => {
  it('sounds when it starts to open and when it starts to close', () => {
    const audio = createShipAudio();
    audio.update({ ...IDLE, piloting: false, landed: true, hatch: 0 });

    const opening = audio.update({ ...IDLE, piloting: false, landed: true, hatch: 0.1 });
    const still = audio.update({ ...IDLE, piloting: false, landed: true, hatch: 0.5 });
    audio.update({ ...IDLE, piloting: false, landed: true, hatch: 1 });
    const closing = audio.update({ ...IDLE, piloting: false, landed: true, hatch: 0.9 });

    expect(idsOf(opening.sounds)).toEqual(['ship.hatch.open']);
    expect(still.sounds).toEqual([]);
    expect(idsOf(closing.sounds)).toEqual(['ship.hatch.close']);
  });
});

describe('powering the ship', () => {
  it('sounds when the player sits down and when they stand up', () => {
    const audio = createShipAudio();
    audio.update({ ...IDLE, piloting: false, landed: true });

    const sit = audio.update({ ...IDLE, piloting: true, landed: true });
    const stand = audio.update({ ...IDLE, piloting: false, landed: true });

    expect(idsOf(sit.sounds)).toEqual(['ship.power.up']);
    expect(idsOf(stand.sounds)).toEqual(['ship.power.down']);
  });
});

describe('touching down', () => {
  it('sounds soft or hard by how fast the ship arrived', () => {
    for (const [speed, id] of [
      [1.5, 'ship.touchdown.soft'],
      [9, 'ship.touchdown.hard'],
    ] as const) {
      const audio = flying();
      audio.update({ ...IDLE, speed });

      const { sounds } = audio.update({ ...IDLE, speed: 0, landed: true });

      expect(idsOf(sounds)).toEqual([id]);
    }
  });

  it('does not sound at the start for a ship that was already parked', () => {
    const audio = createShipAudio();

    expect(audio.update({ ...IDLE, piloting: false, landed: true }).sounds).toEqual([]);
  });
});

describe('hitting something', () => {
  it('sounds a light or a heavy hit by the speed of the impact', () => {
    const light = flying().update({ ...IDLE, impact: 3 });
    const heavy = flying().update({ ...IDLE, impact: 9 });

    expect(idsOf(light.sounds)).toEqual(['ship.hit.light']);
    expect(idsOf(heavy.sounds)).toEqual(['ship.hit.heavy']);
  });

  it('ignores the tiniest touches', () => {
    expect(flying().update({ ...IDLE, impact: 0.4 }).sounds).toEqual([]);
  });

  it('crashes with its own sound', () => {
    expect(idsOf(flying().update({ ...IDLE, impact: 20, crashed: true }).sounds)).toEqual([
      'ship.crash',
    ]);
  });
});

describe('pausing', () => {
  it('silences the loops while time does not run, and brings them back after', () => {
    const audio = flying();
    const levelsOn = levels({ [thruster('main')]: 0.8 });
    expect(audio.update({ ...IDLE, levels: levelsOn }).loops.main.level).toBeCloseTo(0.8);

    // La salida se reutiliza: se lee antes de pedir el fotograma siguiente.
    const whilePaused = audio.update({ ...IDLE, levels: levelsOn, paused: true }).loops.main.level;
    const afterwards = audio.update({ ...IDLE, levels: levelsOn }).loops.main.level;

    expect(whilePaused).toBe(0);
    expect(afterwards).toBeCloseTo(0.8);
  });
});

describe('a sudden reset of the ship', () => {
  it('does not sound the jump from flying to parked at home', () => {
    const audio = flying();
    audio.update({ ...IDLE, speed: 9, hatch: 0 });
    audio.reset();

    const { sounds } = audio.update({ ...IDLE, piloting: false, landed: true, speed: 0, hatch: 0 });

    expect(sounds).toEqual([]);
  });

  it('does not sound a hatch that was closed by the reset', () => {
    const audio = createShipAudio();
    audio.update({ ...IDLE, piloting: false, landed: true, hatch: 1 });
    audio.reset();

    expect(audio.update({ ...IDLE, piloting: false, landed: true, hatch: 0 }).sounds).toEqual([]);
  });

  it('lets the thrusters ignite again afterwards', () => {
    const audio = flying();
    const main = thruster('main', 'left');
    audio.update({ ...IDLE, levels: levels({ [main]: 0.8 }) });
    audio.reset();
    for (let i = 0; i < 30; i++) audio.update({ ...IDLE, levels: levels() });

    expect(idsOf(audio.update({ ...IDLE, levels: levels({ [main]: 0.8 }) }).sounds)).toEqual([
      'thr.ignite',
    ]);
  });
});

describe('landing and hitting at once', () => {
  it('sounds only the touchdown for the gentle touch that parks the ship', () => {
    const audio = flying();
    audio.update({ ...IDLE, speed: 1.5 });

    const { sounds } = audio.update({ ...IDLE, speed: 0, landed: true, impact: 2 });

    expect(idsOf(sounds)).toEqual(['ship.touchdown.soft']);
  });

  it('still sounds a heavy hit on the same frame as the touchdown', () => {
    const audio = flying();
    audio.update({ ...IDLE, speed: 9 });

    const { sounds } = audio.update({ ...IDLE, speed: 0, landed: true, impact: 9 });

    expect(idsOf(sounds)).toEqual(['ship.touchdown.hard', 'ship.hit.heavy']);
  });
});
