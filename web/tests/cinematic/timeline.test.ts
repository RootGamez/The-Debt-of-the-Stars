import { describe, expect, it } from 'vitest';
import {
  cameraAt,
  cuesBetween,
  nextShotStart,
  revealedLetters,
  shotAt,
  subtitleAt,
  trackValue,
  validateCinematic,
  type Cinematic,
  type Line,
  type ScalarKey,
  type Shot,
} from '../../src/cinematic/timeline';

const sky: Shot = {
  id: 'cielo',
  start: 0,
  end: 10,
  ease: 'linear',
  keys: [
    { t: 0, pos: [0, 0, 0], look: [0, 1, 0] },
    { t: 10, pos: [10, 0, 0], look: [0, 1, 0], fov: 30 },
  ],
  rest: 0,
};
const bench: Shot = {
  id: 'banco',
  start: 10,
  end: 20,
  keys: [
    { t: 0, pos: [0, 5, 0], look: [0, 0, 0] },
    { t: 10, pos: [0, 2, 0], look: [0, 0, 0] },
  ],
};
const second: Line = { start: 12, end: 15, speaker: 'el', text: 'Ya no cuento.' };
const light: ScalarKey[] = [
  { t: 0, v: 0 },
  { t: 10, v: 1 },
];

const scene: Cinematic = {
  id: 'prueba',
  duration: 20,
  fov: 50,
  shots: [sky, bench],
  lines: [{ start: 2, end: 5, speaker: 'ella', text: 'Hola.' }, second],
  cues: [
    { at: 0, id: 'fundido' },
    { at: 4, id: 'musica', persistent: true },
    { at: 11, id: 'taza' },
  ],
  tracks: { luz: light, vacia: [] },
};

describe('validateCinematic', () => {
  it('una cinemática bien hecha no tiene errores', () => {
    expect(validateCinematic({ ...scene, tracks: { luz: light } })).toEqual([]);
  });

  it('encuentra huecos entre planos, claves fuera de su plano, frases solapadas y pistas vacías', () => {
    const broken: Cinematic = {
      ...scene,
      shots: [
        { ...sky, end: 9, rest: 5 },
        { ...bench, keys: [{ t: 12, pos: [0, 0, 0], look: [1, 0, 0] }] },
      ],
      lines: [
        { start: 2, end: 5, speaker: 'ella', text: 'a' },
        { start: 4, end: 3, speaker: 'el', text: 'b' },
      ],
      cues: [{ at: 30, id: 'tarde' }],
    };
    const errors = validateCinematic(broken).join('\n');
    expect(errors).toMatch(/cielo/);
    expect(errors).toMatch(/hueco|empieza/);
    expect(errors).toMatch(/rest/);
    expect(errors).toMatch(/banco/);
    expect(errors).toMatch(/frase 1/);
    expect(errors).toMatch(/tarde/);
    expect(errors).toMatch(/vacia/);
  });
});

describe('planos y cámara', () => {
  it('cada tiempo cae en su plano, y fuera de la escena en el primero o el último', () => {
    expect(shotAt(scene, 3).shot.id).toBe('cielo');
    expect(shotAt(scene, 10).shot.id).toBe('banco');
    expect(shotAt(scene, -2)).toMatchObject({ index: 0, local: 0 });
    expect(shotAt(scene, 99)).toMatchObject({ index: 1, local: 10 });
  });

  it('la cámara sigue la curva con el ritmo del plano', () => {
    expect(cameraAt(scene, 5).pos[0]).toBeCloseTo(5);
    expect(cameraAt(scene, 5).fov).toBeLessThan(50);
    // Por defecto los planos arrancan y frenan: a un 10 % del tiempo aún va despacio.
    expect(cameraAt(scene, 11).pos[1]).toBeGreaterThan(4.9);
  });

  it('con movimiento reducido la cámara se queda en su clave de reposo (la última si no dice)', () => {
    expect(cameraAt(scene, 5, true).pos).toEqual([0, 0, 0]);
    expect(cameraAt(scene, 12, true).pos).toEqual([0, 2, 0]);
  });

  it('el siguiente plano', () => {
    expect(nextShotStart(scene, 3)).toBe(10);
    expect(nextShotStart(scene, -1)).toBe(10);
    expect(nextShotStart(scene, 12)).toBe(20);
  });
});

describe('subtítulos', () => {
  it('se ven solo en su tiempo, con fundido de entrada y salida', () => {
    expect(subtitleAt(scene, 1)).toBeUndefined();
    const start = subtitleAt(scene, 2.05);
    expect(start?.line.text).toBe('Hola.');
    expect(start?.alpha).toBeLessThan(0.5);
    expect(subtitleAt(scene, 3.5)?.alpha).toBe(1);
    expect(subtitleAt(scene, 4.95)?.alpha).toBeLessThan(0.5);
    expect(subtitleAt(scene, 13)?.line.speaker).toBe('el');
  });

  it('las letras aparecen a su ritmo, o todas de golpe', () => {
    const line = second;
    expect(revealedLetters(line, 11, 20)).toBe(0);
    expect(revealedLetters(line, 12.25, 20)).toBe(5);
    expect(revealedLetters(line, 14, 20)).toBe(line.text.length);
    expect(revealedLetters(line, 12, Infinity)).toBe(line.text.length);
  });
});

describe('pistas y señales', () => {
  it('una pista va de clave en clave; sin claves, el valor de reserva', () => {
    expect(trackValue(scene, 'luz', -1)).toBe(0);
    expect(trackValue(scene, 'luz', 5)).toBeCloseTo(0.5);
    expect(trackValue(scene, 'luz', 50)).toBe(1);
    expect(trackValue(scene, 'vacia', 3, 0.7)).toBe(0.7);
    expect(trackValue(scene, 'no-existe', 3, 0.2)).toBe(0.2);
  });

  it('las señales se disparan una vez al pasar por ellas', () => {
    expect(cuesBetween(scene, -1, 0).map((cue) => cue.id)).toEqual(['fundido']);
    expect(cuesBetween(scene, 0, 4).map((cue) => cue.id)).toEqual(['musica']);
    expect(cuesBetween(scene, 4, 10)).toEqual([]);
  });

  it('al saltar por encima solo se aplican las que dejan algo puesto', () => {
    expect(cuesBetween(scene, 0, 20, true).map((cue) => cue.id)).toEqual(['musica']);
  });
});
