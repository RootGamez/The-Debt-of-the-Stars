import { describe, expect, it } from 'vitest';
import { buildRegistryView } from '../../src/registry/registryView';
import { at, parse, raw } from '../helpers/clueFixture';

const clues = parse();
const known = (...ids: string[]): ReadonlySet<string> => new Set(ids);

describe('buildRegistryView', () => {
  it('has one section per thread, in the order of the data', () => {
    expect(buildRegistryView(clues, known()).threads.map((t) => t.thread.id)).toEqual(['H2', 'H5']);
  });

  it('is empty when nothing is known', () => {
    const view = buildRegistryView(clues, known());

    expect(view.totalFacts).toBe(0);
    expect(view.threads.every((t) => t.facts.length === 0 && t.rumors.length === 0)).toBe(true);
    expect(view.conclusions).toEqual([]);
  });

  it('lists known facts under their first thread with their line', () => {
    const view = buildRegistryView(clues, known('deuda.palabra', 'lab.existe_lugar_lento'));

    expect(view.threads[0]?.facts.map((f) => f.line)).toEqual(['La placa habla de una cuenta.']);
    expect(view.threads[1]?.facts.map((f) => f.id)).toEqual(['lab.existe_lugar_lento']);
    expect(view.totalFacts).toBe(2);
  });

  it('shows rumors as questions, under the thread of the rumored fact', () => {
    const view = buildRegistryView(clues, known('lab.existe_lugar_lento'));

    expect(view.threads[1]?.rumors).toEqual([
      { id: 'lab.imagen_desplazada', question: '¿Dónde está ese sitio, si nadie lo ve?' },
    ]);
  });

  it('adds "see also" links only to facts that are already known', () => {
    const view = buildRegistryView(clues, known('deuda.palabra', 'lab.existe_lugar_lento'));

    const fact = view.threads[1]?.facts[0];
    expect(fact?.related).toEqual([{ id: 'deuda.palabra', line: 'La placa habla de una cuenta.' }]);
  });

  it('lists unlocked conclusions with their title and thread', () => {
    const view = buildRegistryView(clues, known('lab.existe_lugar_lento'));

    expect(view.conclusions).toEqual([{ id: 'K1', title: 'Existe un sitio lento', thread: 'H5' }]);
  });

  it('counts facts per thread and says how many facts each thread could still reveal', () => {
    const view = buildRegistryView(clues, known('lab.existe_lugar_lento'));

    expect(view.threads[1]?.known).toBe(1);
    expect(view.threads[1]?.total).toBe(2);
  });

  it('has no deduction while nothing of a conclusion is known', () => {
    expect(buildRegistryView(clues, known()).deductions).toEqual([]);
  });

  it('opens a deduction as soon as one of its pieces is known, with the missing ones as questions', () => {
    const d = raw();
    Object.assign(at(d.hechos, 2), { pista: 'Alguien que mira el cielo lo anotaría.' });
    const view = buildRegistryView(parse(d), known('lab.existe_lugar_lento'));

    expect(view.deductions.map((x) => x.id)).toEqual(['K1', 'K3']);
    const k3 = view.deductions[1];
    expect(k3?.unlocked).toBe(false);
    expect(k3?.pieces).toEqual([
      { met: true, line: 'Existe un sitio lento' },
      {
        met: false,
        line: '¿Dónde está ese sitio, si nadie lo ve?',
        lead: 'Alguien que mira el cielo lo anotaría.',
      },
    ]);
  });

  it('says what is now known and what to do once a deduction is complete', () => {
    const d = raw();
    Object.assign(at(d.conclusiones, 0), { sabe: 'Había un sitio lento.', accion: 'Buscarlo.' });
    const view = buildRegistryView(parse(d), known('lab.existe_lugar_lento'));

    expect(view.deductions[0]).toEqual({
      id: 'K1',
      title: 'Existe un sitio lento',
      unlocked: true,
      knowLine: 'Había un sitio lento.',
      action: 'Buscarlo.',
      pieces: [{ met: true, line: 'Hubo un destino donde el tiempo casi no avanzaba.' }],
    });
  });

  it('counts a group of alternatives as met with any of them, showing the one that is known', () => {
    const view = buildRegistryView(clues, known('lab.existe_lugar_lento', 'deuda.palabra'));

    expect(view.deductions[1]?.unlocked).toBe(true);
    expect(view.deductions[1]?.pieces[1]).toEqual({
      met: true,
      line: 'La placa habla de una cuenta.',
    });
  });
});
