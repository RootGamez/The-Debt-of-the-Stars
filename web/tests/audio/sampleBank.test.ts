import { describe, expect, it, vi } from 'vitest';
import { createSampleBank, parseIndex } from '../../src/audio/sampleBank';

const INDEX = {
  version: 1,
  sounds: {
    'step.dust': { files: ['step_dust_1.mp3', 'step_dust_2.mp3'], category: 'foley', gain: 0.8 },
    'thr.main.loop': { files: ['thr_main_loop.mp3'], category: 'ship', loop: true },
  },
};

function response(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as unknown as Response;
}

/** Un `fetch` de mentira: el índice y, de cada archivo, unos bytes. */
function fakeFetch(index: unknown = INDEX, missing: string[] = []) {
  return vi.fn((url: string) => {
    if (url.endsWith('index.json')) return Promise.resolve(response(index, index !== null));
    if (missing.some((name) => url.endsWith(name))) return Promise.resolve(response(null, false));
    return Promise.resolve(response(null));
  });
}

const decode = (name: string) => Promise.resolve({ duration: 1, name } as unknown as AudioBuffer);

function bankWith(fetchFn: ReturnType<typeof fakeFetch>) {
  return createSampleBank({
    baseUrl: '/audio/',
    fetchFn: fetchFn as unknown as typeof fetch,
    decode: () => decode('x'),
  });
}

describe('parseIndex', () => {
  it('keeps the valid entries and their defaults', () => {
    const index = parseIndex(INDEX);

    expect(index.sounds['step.dust']).toEqual({
      files: ['step_dust_1.mp3', 'step_dust_2.mp3'],
      category: 'foley',
      gain: 0.8,
      loop: false,
    });
    expect(index.sounds['thr.main.loop']?.gain).toBe(1);
    expect(index.sounds['thr.main.loop']?.loop).toBe(true);
  });

  it('drops entries without files and ignores garbage', () => {
    const index = parseIndex({
      version: 1,
      sounds: { a: { files: [] }, b: { files: [3] }, c: 7, d: { files: ['d.mp3'] } },
    });

    expect(Object.keys(index.sounds)).toEqual(['d']);
    expect(parseIndex(null).sounds).toEqual({});
    expect(parseIndex('x').sounds).toEqual({});
    expect(parseIndex({ version: 1 }).sounds).toEqual({});
  });

  it('refuses file names that could leave the audio folder', () => {
    const index = parseIndex({
      version: 1,
      sounds: { a: { files: ['../secret.mp3'] }, b: { files: ['https://x.test/a.mp3'] } },
    });

    expect(index.sounds).toEqual({});
  });
});

describe('the sample bank', () => {
  it('reads the index once started', async () => {
    const bank = bankWith(fakeFetch());

    await bank.init();

    expect(bank.entry('step.dust')?.category).toBe('foley');
    expect(bank.entry('nada')).toBeUndefined();
  });

  it('lists every sound of the index', async () => {
    const bank = bankWith(fakeFetch());
    await bank.init();

    expect(bank.ids()).toEqual(['step.dust', 'thr.main.loop']);
  });

  it('stays empty, without throwing, when there is no index', async () => {
    const bank = bankWith(fakeFetch(null));

    await expect(bank.init()).resolves.toBeUndefined();

    expect(bank.entry('step.dust')).toBeUndefined();
  });

  it('stays empty when the index fetch itself fails', async () => {
    const bank = createSampleBank({
      baseUrl: '/audio/',
      fetchFn: () => Promise.reject(new Error('sin red')),
      decode: () => decode('x'),
    });

    await expect(bank.init()).resolves.toBeUndefined();
    expect(bank.entry('step.dust')).toBeUndefined();
  });

  it('downloads and decodes the files of a sound once', async () => {
    const fetchFn = fakeFetch();
    const bank = bankWith(fetchFn);
    await bank.init();

    await bank.load(['step.dust']);
    await bank.load(['step.dust']);

    expect(bank.buffers('step.dust')).toHaveLength(2);
    expect(bank.loaded('step.dust')).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith('/audio/step_dust_1.mp3');
    expect(fetchFn.mock.calls.filter(([url]) => url.endsWith('step_dust_1.mp3'))).toHaveLength(1);
  });

  it('does not download the same file twice when asked at the same time', async () => {
    const fetchFn = fakeFetch();
    const bank = bankWith(fetchFn);
    await bank.init();

    await Promise.all([bank.load(['thr.main.loop']), bank.load(['thr.main.loop'])]);

    expect(fetchFn.mock.calls.filter(([url]) => url.endsWith('thr_main_loop.mp3'))).toHaveLength(1);
  });

  it('keeps the variants that did load when one fails, and does not retry the failure', async () => {
    const fetchFn = fakeFetch(INDEX, ['step_dust_2.mp3']);
    const bank = bankWith(fetchFn);
    await bank.init();

    await bank.load(['step.dust']);
    await bank.load(['step.dust']);

    expect(bank.buffers('step.dust')).toHaveLength(1);
    expect(bank.failures).toEqual(['step_dust_2.mp3']);
    expect(fetchFn.mock.calls.filter(([url]) => url.endsWith('step_dust_2.mp3'))).toHaveLength(1);
  });

  it('has nothing to play for a sound that is not loaded or not in the index', async () => {
    const bank = bankWith(fakeFetch());
    await bank.init();

    expect(bank.buffers('step.dust')).toBeUndefined();
    await bank.load(['no.existe']);
    expect(bank.buffers('no.existe')).toBeUndefined();
    expect(bank.loaded('no.existe')).toBe(false);
  });

  it('survives a decoder that rejects', async () => {
    const bank = createSampleBank({
      baseUrl: '/audio/',
      fetchFn: fakeFetch() as unknown as typeof fetch,
      decode: () => Promise.reject(new Error('mp3 roto')),
    });
    await bank.init();

    await expect(bank.load(['thr.main.loop'])).resolves.toBeUndefined();

    expect(bank.loaded('thr.main.loop')).toBe(false);
    expect(bank.failures).toEqual(['thr_main_loop.mp3']);
  });
});
