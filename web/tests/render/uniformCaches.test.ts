import { describe, expect, it } from 'vitest';
import { keepUniformCachesNumeric } from '../../src/render/uniformCaches';

const GL_BOOL = 0x8b56;
const GL_FLOAT_MAT4 = 0x8b5c;

interface FakeUniform {
  type: number;
  cache: unknown[];
  setValue: (gl: unknown, value: unknown) => void;
}

/** Un uniforme como los de three: guarda lo último que mandó y no lo repite. */
function fakeUniform(type: number, sent: unknown[]): FakeUniform {
  const uniform: FakeUniform = {
    type,
    cache: [],
    setValue(_gl, value) {
      if (uniform.cache[0] === value) return;
      sent.push(value);
      uniform.cache[0] = value;
    },
  };
  return uniform;
}

interface FakeProgram {
  getUniforms: () => unknown;
  reads: number;
}

function fakeProgram(seq: unknown[]): FakeProgram {
  const uniforms = { seq, map: {} };
  const program: FakeProgram = {
    reads: 0,
    getUniforms: () => {
      program.reads++;
      return uniforms;
    },
  };
  return program;
}

describe('keepUniformCachesNumeric', () => {
  it('los bool de los programas que se añaden guardan y mandan 0 o 1', () => {
    // Arrange
    const programs: unknown[] = [];
    const sent: unknown[] = [];
    const flag = fakeUniform(GL_BOOL, sent);
    const program = fakeProgram([flag]);
    keepUniformCachesNumeric(programs);

    // Act
    programs.push(program);
    program.getUniforms();
    flag.setValue(null, true);
    flag.setValue(null, true);
    flag.setValue(null, false);

    // Assert
    expect(programs).toEqual([program]);
    expect(sent).toEqual([1, 0]);
    expect(flag.cache).toEqual([0]);
  });

  it('también los de structs anidados; el resto de uniformes no se toca', () => {
    // Arrange
    const programs: unknown[] = [];
    const sent: unknown[] = [];
    const nested = fakeUniform(GL_BOOL, sent);
    const matrix = fakeUniform(GL_FLOAT_MAT4, sent);
    const matrixSetter = matrix.setValue;
    const program = fakeProgram([matrix, { id: 'luz', seq: [nested], map: {} }]);
    keepUniformCachesNumeric(programs);

    // Act
    programs.push(program);
    program.getUniforms();
    nested.setValue(null, true);

    // Assert
    expect(matrix.setValue).toBe(matrixSetter);
    expect(sent).toEqual([1]);
  });

  it('arregla cada programa una sola vez y deja su método como estaba', () => {
    // Arrange
    const programs: unknown[] = [];
    const sent: unknown[] = [];
    const flag = fakeUniform(GL_BOOL, sent);
    const program = fakeProgram([flag]);
    const original = program.getUniforms;
    keepUniformCachesNumeric(programs);
    keepUniformCachesNumeric(programs);

    // Act
    programs.push(program);
    program.getUniforms();
    program.getUniforms();
    flag.setValue(null, true);

    // Assert
    expect(program.getUniforms).toBe(original);
    expect(program.reads).toBe(2);
    expect(sent).toEqual([1]);
  });

  it('arregla también los programas que ya estaban en la lista', () => {
    // Arrange
    const sent: unknown[] = [];
    const flag = fakeUniform(GL_BOOL, sent);
    const program = fakeProgram([flag]);
    const programs: unknown[] = [program];

    // Act
    keepUniformCachesNumeric(programs);
    program.getUniforms();
    flag.setValue(null, true);

    // Assert
    expect(sent).toEqual([1]);
  });

  it('no hace nada sin lista o si three cambia por dentro', () => {
    // Arrange
    const programs: unknown[] = [];
    keepUniformCachesNumeric(programs);

    // Act / Assert
    expect(keepUniformCachesNumeric(null)).toBe(false);
    expect(keepUniformCachesNumeric(undefined)).toBe(false);
    expect(() => programs.push(null, 3, { getUniforms: () => null })).not.toThrow();
    expect(programs).toHaveLength(3);
  });
});
