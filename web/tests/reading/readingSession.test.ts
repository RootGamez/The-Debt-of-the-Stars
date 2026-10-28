import { describe, expect, it } from 'vitest';
import { ReadingSession } from '../../src/reading/readingSession';
import { parse, withRecording } from '../helpers/clueFixture';

const clues = parse();

function session(initial: string[] = [], persist = () => true) {
  const saved: string[][] = [];
  const s = new ReadingSession(clues, initial, (facts) => {
    saved.push([...facts]);
    return persist();
  });
  return { s, saved };
}

describe('opening a source', () => {
  it('shows the reading, learns its facts and saves them', () => {
    const { s, saved } = session();

    const reading = s.open('umbral.placa', []);

    expect(reading?.title).toBe('Placa de inauguración');
    expect(reading?.text).toEqual(['Hoy empieza la cuenta.']);
    expect(reading?.newFacts).toEqual(['deuda.palabra']);
    expect(s.known.has('deuda.palabra')).toBe(true);
    expect(saved).toEqual([['deuda.palabra']]);
  });

  it('freezes time while a reading is open and releases it on close', () => {
    const { s } = session();
    expect(s.frozen).toBe(false);

    s.open('umbral.placa', []);
    expect(s.frozen).toBe(true);

    s.close();
    expect(s.frozen).toBe(false);
    expect(s.current).toBeNull();
  });

  it('shows the deep reading once its requirements are known', () => {
    const { s } = session(['deuda.palabra']);

    const reading = s.open('umbral.envios', []);

    expect(reading?.level).toBe('deep');
    expect(reading?.newFacts).toEqual(['lab.existe_lugar_lento']);
  });

  it('flags a deep reading that is still locked', () => {
    const { s } = session();

    expect(s.open('umbral.envios', [])?.deepPending).toBe(true);
  });

  it('does not save again when nothing new was learned', () => {
    const { s, saved } = session(['deuda.palabra']);

    s.open('umbral.placa', []);

    expect(saved).toEqual([]);
  });

  it('keeps playing and remembers when saving failed', () => {
    const { s } = session([], () => false);

    s.open('umbral.placa', []);

    expect(s.saveFailed).toBe(true);
    expect(s.known.has('deuda.palabra')).toBe(true);
  });

  it('cannot open an unknown source or an event source', () => {
    const { s } = session();

    expect(s.open('no.existe', [])).toBeNull();
    expect(s.open('umbral.destello', ['boca_destello'])).toBeNull();
  });

  it('ignores saved facts that no longer exist in the data', () => {
    const { s } = session(['hecho.viejo', 'deuda.palabra']);

    expect([...s.known]).toEqual(['deuda.palabra']);
  });

  it('does not modify the list of initial facts it is given', () => {
    const initial = ['deuda.palabra'];

    session(initial).s.open('umbral.envios', []);

    expect(initial).toEqual(['deuda.palabra']);
  });
});

describe('sources that only exist during an event', () => {
  const timed = parse({
    ...structuredClone({
      hilos: [{ id: 'H5', pregunta: 'p', respuesta: 'r' }],
      hechos: [{ id: 'a.uno', hilos: ['H5'], frase: 'uno' }],
      conclusiones: [{ id: 'K1', titulo: 'k', hilo: 'H5', requiere: ['a.uno'] }],
      fuentes: [
        {
          id: 'umbral.luz',
          mundo: 'umbral',
          tipo: 'texto',
          titulo: 'La luz',
          cuando: 'boca_destello',
          superficial: { texto: ['t'], hechos: ['a.uno'] },
        },
      ],
    }),
  });

  it('can only be opened while that event is active', () => {
    const s = new ReadingSession(timed, [], () => true);

    expect(s.isAvailable('umbral.luz', [])).toBe(false);
    expect(s.open('umbral.luz', [])).toBeNull();
    expect(s.isAvailable('umbral.luz', ['boca_destello'])).toBe(true);
    expect(s.open('umbral.luz', ['boca_destello'])?.newFacts).toEqual(['a.uno']);
  });
});

describe('witnessing an event', () => {
  it('learns the facts of an event source when it is active, without opening a panel', () => {
    const { s, saved } = session();

    const learned = s.witness('umbral.destello', ['boca_destello']);

    expect(learned).toEqual(['lab.imagen_desplazada']);
    expect(s.current).toBeNull();
    expect(s.frozen).toBe(false);
    expect(saved).toEqual([['lab.imagen_desplazada']]);
  });

  it('learns nothing when the event is not active or was already witnessed', () => {
    const { s } = session();

    expect(s.witness('umbral.destello', [])).toEqual([]);
    s.witness('umbral.destello', ['boca_destello']);
    expect(s.witness('umbral.destello', ['boca_destello'])).toEqual([]);
  });

  it('ignores sources that are not events', () => {
    expect(session().s.witness('umbral.placa', ['boca_destello'])).toEqual([]);
  });
});

describe('listening to a recording', () => {
  const recorded = parse(withRecording());

  function listener(initial: string[] = []) {
    const saved: string[][] = [];
    const s = new ReadingSession(recorded, initial, (facts) => {
      saved.push([...facts]);
      return true;
    });
    return { s, saved };
  }

  it('opens with what is heard and the lines to play, at the clock it was recorded with', () => {
    const { s } = listener();

    const opened = s.open('cicatriz.grabacion', []);

    expect(opened?.text).toEqual(['Una voz lentísima.']);
    expect(opened?.recording).toEqual({
      rate: 0.2,
      lines: ['Aquí un día vuestro son cinco.', 'La luz sale torcida.'],
      understoodBefore: false,
    });
    expect(opened?.deepPending).toBe(false);
  });

  it('gives nothing deep just for opening it, even when the requirements are known', () => {
    const { s } = listener(['deuda.palabra']);

    expect(s.open('cicatriz.grabacion', [])?.newFacts).toEqual([]);
    expect(s.known.has('lab.existe_lugar_lento')).toBe(false);
  });

  it('learns the deep facts once it is understood, and only once', () => {
    const { s, saved } = listener();
    s.open('cicatriz.grabacion', []);

    expect(s.understand()).toEqual(['lab.existe_lugar_lento', 'lab.imagen_desplazada']);
    expect(s.understand()).toEqual([]);
    expect(saved).toEqual([['lab.existe_lugar_lento', 'lab.imagen_desplazada']]);
  });

  it('remembers that it was understood before (the wheel can start at the right speed)', () => {
    const { s } = listener(['lab.existe_lugar_lento', 'lab.imagen_desplazada']);

    expect(s.open('cicatriz.grabacion', [])?.recording?.understoodBefore).toBe(true);
  });

  it('understands nothing when what is open is not a recording', () => {
    const { s } = listener();
    s.open('umbral.placa', []);

    expect(s.understand()).toEqual([]);
    expect(s.known.has('lab.existe_lugar_lento')).toBe(false);
  });

  it('understands nothing with nothing open', () => {
    expect(listener().s.understand()).toEqual([]);
  });

  it('texts have no recording', () => {
    expect(listener().s.open('umbral.placa', [])?.recording).toBeUndefined();
  });
});

describe('what the session knows', () => {
  it('derives rumors and unlocked conclusions from the facts', () => {
    const { s } = session(['lab.existe_lugar_lento']);

    expect(s.rumors()).toEqual(['lab.imagen_desplazada']);
    expect([...s.conclusions()]).toEqual(['K1']);
  });

  it('reports newly learned facts through a listener', () => {
    const { s } = session();
    const heard: string[][] = [];
    s.onLearn((facts) => heard.push(facts));

    s.open('umbral.placa', []);

    expect(heard).toEqual([['deuda.palabra']]);
  });
});
