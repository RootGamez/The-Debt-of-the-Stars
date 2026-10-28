import { describe, expect, it } from 'vitest';
import {
  canGiveNew,
  obtainableFacts,
  readingFor,
  readSource,
  relatedFacts,
  rumorsOf,
  unlockedConclusions,
} from '../../src/registry/knowledge';
import { parse, withRecording } from '../helpers/clueFixture';
import type { Source } from '../../src/registry/clues';

const clues = parse();

function source(id: string): Source {
  const found = clues.sourceById.get(id);
  if (!found) throw new Error(`falta la fuente de prueba ${id}`);
  return found;
}

const known = (...ids: string[]): ReadonlySet<string> => new Set(ids);

describe('readingFor', () => {
  it('shows the surface reading when the deep one is not unlocked yet', () => {
    const view = readingFor(source('umbral.envios'), known());

    expect(view.level).toBe('surface');
    expect(view.deepPending).toBe(true);
  });

  it('shows the deepest reading allowed by what is already known', () => {
    const view = readingFor(source('umbral.envios'), known('deuda.palabra'));

    expect(view.level).toBe('deep');
    expect(view.reading.text).toEqual(['Los acuses casi no avanzan.']);
    expect(view.deepPending).toBe(false);
  });

  it('never reports a pending deep reading for a source that has none', () => {
    expect(readingFor(source('umbral.placa'), known()).deepPending).toBe(false);
  });
});

describe('readSource', () => {
  it('learns the facts of the surface reading', () => {
    expect(readSource(source('umbral.placa'), known()).newFacts).toEqual(['deuda.palabra']);
  });

  it('learns the facts of both readings when the deep one applies, without repeating known ones', () => {
    const result = readSource(source('umbral.envios'), known('deuda.palabra'));

    expect(result.newFacts).toEqual(['lab.existe_lugar_lento']);
  });

  it('learns nothing new when everything was already known', () => {
    expect(readSource(source('umbral.placa'), known('deuda.palabra')).newFacts).toEqual([]);
  });

  it('does not change the set of known facts it is given', () => {
    const before = known('deuda.palabra');

    readSource(source('umbral.envios'), before);

    expect([...before]).toEqual(['deuda.palabra']);
  });
});

describe('canGiveNew', () => {
  it('is true while the source still has facts to give and false afterwards', () => {
    expect(canGiveNew(source('umbral.placa'), known())).toBe(true);
    expect(canGiveNew(source('umbral.placa'), known('deuda.palabra'))).toBe(false);
  });

  it('does not count a locked deep reading', () => {
    expect(canGiveNew(source('umbral.envios'), known())).toBe(false);
    expect(canGiveNew(source('umbral.envios'), known('deuda.palabra'))).toBe(true);
  });

  it('counts what a recording gives once understood, whatever is known (understanding it is the key)', () => {
    const recording = parse(withRecording()).sourceById.get('cicatriz.grabacion');
    if (!recording) throw new Error('falta la grabación de prueba');

    expect(canGiveNew(recording, known())).toBe(true);
    expect(canGiveNew(recording, known('lab.existe_lugar_lento', 'lab.imagen_desplazada'))).toBe(
      false,
    );
  });
});

describe('unlockedConclusions', () => {
  it('unlocks a conclusion when its facts are known', () => {
    expect([...unlockedConclusions(clues, known('lab.existe_lugar_lento'))]).toEqual(['K1']);
  });

  it('needs every group, and any alternative inside a group', () => {
    const withAlternative = unlockedConclusions(
      clues,
      known('lab.existe_lugar_lento', 'deuda.palabra'),
    );
    const withTheOther = unlockedConclusions(
      clues,
      known('lab.existe_lugar_lento', 'lab.imagen_desplazada'),
    );
    const missingGroup = unlockedConclusions(clues, known('deuda.palabra'));

    expect([...withAlternative].sort()).toEqual(['K1', 'K3']);
    expect([...withTheOther].sort()).toEqual(['K1', 'K3']);
    expect([...missingGroup]).toEqual([]);
  });

  it('is empty when nothing is known', () => {
    expect(unlockedConclusions(clues, known()).size).toBe(0);
  });
});

describe('rumorsOf', () => {
  it('lists mentioned facts that are not known yet, with a question to show', () => {
    expect(rumorsOf(clues, known('lab.existe_lugar_lento'))).toEqual(['lab.imagen_desplazada']);
  });

  it('stops being a rumor once it is known', () => {
    expect(rumorsOf(clues, known('lab.existe_lugar_lento', 'lab.imagen_desplazada'))).toEqual([]);
  });

  it('has no rumors when nothing is known', () => {
    expect(rumorsOf(clues, known())).toEqual([]);
  });
});

describe('relatedFacts', () => {
  it('follows links in both directions and only through known facts', () => {
    const state = known('lab.existe_lugar_lento', 'deuda.palabra');

    expect(relatedFacts(clues, state, 'lab.existe_lugar_lento')).toEqual(['deuda.palabra']);
    expect(relatedFacts(clues, state, 'deuda.palabra')).toEqual(['lab.existe_lugar_lento']);
  });

  it('hides related facts the player has not learned yet', () => {
    expect(relatedFacts(clues, known('lab.existe_lugar_lento'), 'lab.existe_lugar_lento')).toEqual(
      [],
    );
  });
});

describe('obtainableFacts', () => {
  it('reaches every fact when all sources are available', () => {
    expect([...obtainableFacts(clues)].sort()).toEqual([...clues.facts.keys()].sort());
  });

  it('follows the unlocking order: a deep reading needs facts from elsewhere', () => {
    const without = obtainableFacts(clues, { excludeSources: ['umbral.placa'] });

    expect(without.has('deuda.palabra')).toBe(false);
    expect(without.has('lab.existe_lugar_lento')).toBe(false);
  });

  it('can leave a world out', () => {
    const without = obtainableFacts(clues, { excludeWorlds: ['umbral'] });

    expect(without.size).toBe(0);
  });
});
