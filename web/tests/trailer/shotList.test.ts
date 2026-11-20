import { describe, expect, it } from 'vitest';
import { ffmpegArgs, parseShots, shotUrl, type RecordedShot } from '../../src/trailer/shotList';

const good = {
  id: 'umbral-despertar',
  start: 'umbral',
  seconds: 4,
  keys: [{ t: 0, pos: [0, 100, 0], look: [0, 0, 0] }],
};

describe('parseShots', () => {
  it('acepta una toma válida', () => {
    expect(parseShots([good])[0]?.id).toBe('umbral-despertar');
  });

  it('rechaza lo que no es una lista', () => {
    expect(() => parseShots({})).toThrow('deben ser una lista');
  });

  it('rechaza ids con espacios o mayúsculas', () => {
    expect(() => parseShots([{ ...good, id: 'Toma 1' }])).toThrow('Toma 0: id no válido');
  });

  it('rechaza duraciones fuera de rango', () => {
    expect(() => parseShots([{ ...good, seconds: 0 }])).toThrow('seconds');
    expect(() => parseShots([{ ...good, seconds: 500 }])).toThrow('seconds');
  });

  it('rechaza llamadas de preparación raras', () => {
    expect(() => parseShots([{ ...good, setup: [{ call: 'x();alert(1)' }] }])).toThrow(
      'setup.call',
    );
  });

  it('explica una ruta de cámara mala', () => {
    expect(() => parseShots([{ ...good, keys: [] }])).toThrow('Toma 0: La ruta de cámara');
  });

  it('rechaza ids repetidos', () => {
    expect(() => parseShots([good, good])).toThrow('Toma repetida');
  });
});

describe('shotUrl', () => {
  it('arma la URL con el mundo y los modos', () => {
    const url = new URL(shotUrl('http://localhost:5180/?x=1', good as unknown as RecordedShot));
    expect(url.searchParams.get('mundo')).toBe('umbral');
    expect(url.searchParams.has('trailer')).toBe(true);
    expect(url.searchParams.has('debug')).toBe(true);
    expect(url.searchParams.has('x')).toBe(false);
  });
});

describe('ffmpegArgs', () => {
  it('lee los fotogramas numerados y escribe a la salida', () => {
    const args = ffmpegArgs('out/a', 60, 'out/a.mp4');
    expect(args).toContain('out/a/%05d.png');
    expect(args.at(-1)).toBe('out/a.mp4');
    expect(args[args.indexOf('-framerate') + 1]).toBe('60');
  });
});
