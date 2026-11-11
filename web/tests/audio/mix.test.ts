import { describe, expect, it } from 'vitest';
import chronology from '../../src/data/cronologia.json';
import {
  EVENT_SOUNDS,
  RECORDING_VOICE,
  SHIP_SOUND,
  WORLD_SOUNDSCAPES,
  type Soundscape,
} from '../../src/data/soundscapes';
import { computeMix, musicOnlyMix, type MixInput } from '../../src/audio/mix';
import { WORLD_IDS } from '../../src/worlds/worldSelection';

const calm: MixInput = {
  worldId: 'umbral',
  rate: 1,
  events: [],
  absorption: 0,
  hole: 0,
  phase: 'playing',
  fade: 0,
  running: true,
  piloting: false,
  muted: false,
};

function mix(change: Partial<MixInput> = {}) {
  return computeMix({ ...calm, ...change });
}

const voiceIds = (input: Partial<MixInput> = {}): string[] => mix(input).voices.map((v) => v.id);

describe('which voices play', () => {
  it('plays the soundscape of the world you are in', () => {
    expect(voiceIds({ worldId: 'laboratorio' })).toEqual(['mundo:laboratorio']);
  });

  it('falls back to open space away from every world', () => {
    expect(voiceIds({ worldId: undefined })).toEqual(['mundo:espacio']);
    expect(voiceIds({ worldId: 'un-mundo-que-no-existe' })).toEqual(['mundo:espacio']);
  });

  it('adds a voice for each active event that has a sound', () => {
    expect(voiceIds({ events: ['cielo_rojo', 'pulso_cicatriz'] })).toEqual([
      'mundo:umbral',
      'evento:cielo_rojo',
      'evento:pulso_cicatriz',
    ]);
  });

  it('ignores events without a sound', () => {
    expect(voiceIds({ events: ['evento_inventado'] })).toEqual(['mundo:umbral']);
  });

  it('adds the ship voice only while piloting', () => {
    expect(voiceIds({ piloting: true })).toContain('nave');
    expect(voiceIds({ piloting: false })).not.toContain('nave');
  });

  it('every world of the game has its own soundscape', () => {
    for (const world of WORLD_IDS) {
      if (world === 'luna') continue; // la Luna del prólogo aún no existe: usa el espacio abierto
      expect(WORLD_SOUNDSCAPES[world], world).toBeDefined();
    }
  });

  it('every event of the chronology has a sound', () => {
    for (const event of chronology.eventos) expect(EVENT_SOUNDS[event.id], event.id).toBeDefined();
  });
});

describe('the local clock shapes the sound', () => {
  it('slows the pulses and lowers the pitch where time runs slow', () => {
    const lab = mix({ worldId: 'laboratorio', rate: 0.2 });

    expect(lab.tempo).toBeCloseTo(0.2);
    expect(lab.pitch).toBeLessThan(0.7);
    expect(lab.pitch).toBeGreaterThan(0.4);
  });

  it('leaves the sound alone at the normal rate', () => {
    expect(mix().tempo).toBe(1);
    expect(mix().pitch).toBe(1);
  });

  it('keeps tempo and pitch inside safe limits', () => {
    const slow = mix({ rate: 0 });
    const fast = mix({ rate: 50 });

    expect(slow.tempo).toBeGreaterThan(0);
    expect(slow.pitch).toBeGreaterThanOrEqual(0.4);
    expect(fast.tempo).toBeLessThanOrEqual(1.5);
    expect(fast.pitch).toBeLessThanOrEqual(1.25);
  });

  it('survives a rate that is not a number', () => {
    const odd = mix({ rate: Number.NaN });

    expect(Number.isFinite(odd.tempo)).toBe(true);
    expect(Number.isFinite(odd.pitch)).toBe(true);
  });
});

const levelOf = (input: Partial<MixInput>, id: string): number | undefined =>
  mix(input).voices.find((v) => v.id === id)?.level;

describe('listening to a recording', () => {
  const slow = { factor: 0.2, speaking: true };

  it('adds the voice of the recording while it plays', () => {
    expect(voiceIds({ running: false, recording: slow })).toContain('grabacion');
    expect(voiceIds({ running: false, recording: null })).not.toContain('grabacion');
  });

  it('plays the voice at full level even though the loop is stopped, and the world further away', () => {
    const input = { running: false, recording: slow };

    expect(levelOf(input, 'grabacion')).toBe(1);
    expect(levelOf(input, 'mundo:umbral')).toBeLessThan(
      levelOf({ running: false }, 'mundo:umbral') ?? 0,
    );
  });

  it('lets the voice fall silent quickly between sentences, unlike the slow ambience', () => {
    const voices = mix({ running: false, recording: slow }).voices;

    expect(voices.find((v) => v.id === 'grabacion')?.smooth).toBeLessThan(0.2);
    expect(voices.find((v) => v.id === 'mundo:umbral')?.smooth).toBeUndefined();
  });

  it('keeps the voice quiet (but alive) between sentences', () => {
    expect(
      levelOf({ running: false, recording: { factor: 0.2, speaking: false } }, 'grabacion'),
    ).toBe(0);
  });

  it('follows the speed of the recording, not the clock of the place', () => {
    const voice = mix({ rate: 1, running: false, recording: slow }).voices.find(
      (v) => v.id === 'grabacion',
    );

    expect(voice?.tempo).toBeCloseTo(0.2);
    expect(voice?.pitch).toBeLessThan(0.6);
  });

  it('sounds high and hurried when played too fast, within limits', () => {
    const voice = mix({ running: false, recording: { factor: 40, speaking: true } }).voices.find(
      (v) => v.id === 'grabacion',
    );

    expect(voice?.pitch).toBeGreaterThan(1.5);
    expect(voice?.pitch).toBeLessThanOrEqual(3);
    expect(voice?.tempo).toBeLessThanOrEqual(8);
  });
});

describe('the master volume', () => {
  it('is silent when muted', () => {
    expect(mix({ muted: true }).master).toBe(0);
  });

  it('ducks the world while the game is paused or you are reading', () => {
    expect(levelOf({ running: false }, 'mundo:umbral')).toBeLessThan(1);
    expect(levelOf({ running: false }, 'mundo:umbral')).toBeGreaterThan(0);
    expect(levelOf({ running: true }, 'mundo:umbral')).toBe(1);
  });

  it('fades out as the white fade of a death covers the screen', () => {
    const start = mix({ phase: 'dying', fade: 0 }).master;
    const end = mix({ phase: 'dying', fade: 1 }).master;

    expect(start).toBeCloseTo(mix().master);
    expect(end).toBeLessThan(start * 0.2);
  });

  it('falls silent early in the white fade: silence just before the loop starts again', () => {
    expect(mix({ phase: 'dying', fade: 0.1 }).master).toBeGreaterThan(0);
    expect(mix({ phase: 'dying', fade: 0.25 }).master).toBe(0);
    expect(mix({ phase: 'dying', fade: 0.9 }).master).toBe(0);
  });

  it('comes back as the black fade of waking clears', () => {
    expect(mix({ phase: 'waking', fade: 1 }).master).toBeLessThan(mix().master * 0.2);
    expect(mix({ phase: 'waking', fade: 0 }).master).toBeCloseTo(mix().master);
  });

  it('never leaves the 0 to 1 range', () => {
    for (const fade of [-3, 0, 0.5, 1, 9]) {
      const { master } = mix({ phase: 'dying', fade });
      expect(master).toBeGreaterThanOrEqual(0);
      expect(master).toBeLessThanOrEqual(1);
    }
  });
});

describe('the rumble of the black hole', () => {
  const rumble = (hole: number, change: Partial<MixInput> = {}) =>
    levelOf({ events: ['agujero_negro'], hole, ...change }, 'evento:agujero_negro') ?? 0;

  it('is already there, quiet, when the hole is born', () => {
    expect(rumble(0)).toBeGreaterThan(0);
    expect(rumble(0)).toBeLessThan(0.5);
  });

  it('grows with how much of the sky the hole fills (its size and how close it is)', () => {
    expect(rumble(0.1)).toBeGreaterThan(rumble(0));
    expect(rumble(0.25)).toBeGreaterThan(rumble(0.1));
    expect(rumble(1)).toBe(1);
  });

  it('stays within limits and leaves the other voices alone', () => {
    expect(rumble(7)).toBe(1);
    expect(rumble(Number.NaN)).toBe(rumble(0));
    expect(levelOf({ events: ['cielo_rojo'], hole: 0 }, 'evento:cielo_rojo')).toBe(1);
  });

  it('is further away while paused, like everything else', () => {
    expect(rumble(1, { running: false })).toBeLessThan(rumble(1));
  });
});

describe('the muffling', () => {
  it('is wide open while nothing is being absorbed', () => {
    expect(mix().muffle).toBeGreaterThanOrEqual(16000);
  });

  it('closes as the absorption front arrives', () => {
    expect(mix({ absorption: 0.5 }).muffle).toBeLessThan(mix().muffle);
    expect(mix({ absorption: 1 }).muffle).toBeLessThan(mix({ absorption: 0.5 }).muffle);
    expect(mix({ absorption: 1 }).muffle).toBeGreaterThan(100);
  });
});

describe('the soundscape data', () => {
  const all: [string, Soundscape][] = [
    ...Object.entries(WORLD_SOUNDSCAPES).map(
      ([id, s]) => [`mundo:${id}`, s] as [string, Soundscape],
    ),
    ...Object.entries(EVENT_SOUNDS).map(([id, s]) => [`evento:${id}`, s] as [string, Soundscape]),
    ['nave', SHIP_SOUND],
    ['grabacion', RECORDING_VOICE],
  ];

  it.each(all)('%s is well formed and cannot clip alone', (_id, scape) => {
    let total = 0;
    if (scape.noise) {
      expect(scape.noise.frequency).toBeGreaterThan(0);
      expect(scape.noise.q).toBeGreaterThan(0);
      expect(scape.noise.gain).toBeGreaterThan(0);
      total += scape.noise.gain * (1 + (scape.noise.swell?.depth ?? 0));
    }
    for (const tone of scape.tones ?? []) {
      expect(tone.frequency).toBeGreaterThan(0);
      expect(tone.gain).toBeGreaterThan(0);
      total += tone.gain * (1 + (tone.swell?.depth ?? 0));
    }
    if (scape.pulse) {
      expect(scape.pulse.everySeconds).toBeGreaterThan(0);
      expect(scape.pulse.decay).toBeGreaterThan(0);
      expect(scape.pulse.gain).toBeGreaterThan(0);
      for (const spread of [scape.pulse.jitter ?? 0, scape.pulse.wobble ?? 0]) {
        expect(spread).toBeGreaterThanOrEqual(0);
        expect(spread).toBeLessThan(1);
      }
      total += scape.pulse.gain;
    }
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(0.6);
  });
});

describe('the loading screen mix', () => {
  it('lets only the music through, at the usual master volume', () => {
    const loading = musicOnlyMix(false);
    expect(loading.voices).toEqual([]);
    expect(loading.master).toBe(computeMix(calm).master);
  });

  it('stays silent when muted', () => {
    expect(musicOnlyMix(true).master).toBe(0);
  });
});
