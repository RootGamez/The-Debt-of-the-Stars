import { describe, expect, it } from 'vitest';
import { BUBBLE } from '../../src/data/bubble';
import { loadClues } from '../../src/data/pistas';
import { checkLabCloses } from '../../src/registry/graphRules';
import { MAX_SPEED, MIN_SPEED } from '../../src/reading/recording';

describe('the real clue data', () => {
  const clues = loadClues();
  /** Las fuentes del grafo: todas menos las de ambiente (gente de casa que solo habla, notas para curiosos). */
  const graph = clues.sources.filter(
    (s) => !s.ambient && !(s.kind === 'charla' && s.surface.facts.length === 0 && !s.deep),
  );

  it('teaches the way into the Archivo outside the Archivo (Phase 11E): the loose sheet of the Muelle', () => {
    const teaching = clues.sources.filter((s) =>
      [...s.surface.facts, ...(s.deep?.facts ?? [])].includes('archivo.entrada'),
    );

    expect(teaching.map((s) => s.id)).toEqual(['umbral.hoja_entrada']);
    expect(teaching.every((s) => s.world !== 'archivo')).toBe(true);
  });

  it('loads and validates without errors', () => {
    expect(clues.sources.length).toBeGreaterThan(0);
  });

  it('gives voice to the people at home: chats, some of them only small talk', () => {
    const chats = clues.sources.filter((s) => s.kind === 'charla');

    expect(chats.map((s) => s.id)).toContain('instituto.directora');
    // Fuera de casa solo hablan ellos dos, los Ausentes vivos (plan de finales, E4 y E5): sus ids llevan su retrato.
    expect(chats.every((s) => s.world === 'hogar' || /\.(cientifica|esceptico)$/.test(s.id))).toBe(
      true,
    );
    // Solo la Directora da hechos.
    expect(chats.filter((s) => s.surface.facts.length > 0 || s.deep).map((s) => s.id)).toEqual([
      'instituto.directora',
    ]);
  });

  it('keeps the notes for the curious (home, Observatorio, the anchorages of the Cerco) out of the graph (Phase 11G)', () => {
    const ambient = clues.sources.filter((s) => s.ambient);

    expect(ambient.length).toBeGreaterThanOrEqual(10);
    // Las cinco lecturas del Cerco (plan de soles): dos en un anclaje y tres en el otro, todas de ambiente.
    expect(ambient.filter((s) => s.world.startsWith('anclaje_'))).toHaveLength(5);
    expect(
      ambient.every(
        (s) =>
          [
            'hogar',
            'observatorio',
            'laboratorio',
            'puertas',
            'umbral',
            'archivo',
            'taller',
            'anclaje_norte',
            'anclaje_sur',
          ].includes(s.world) &&
          s.surface.facts.length === 0 &&
          !s.deep,
      ),
    ).toBe(true);
    expect(ambient.map((s) => s.id)).toContain('hogar.bitacora_albatros');
    expect(ambient.map((s) => s.id)).toContain('observatorio.registrador');
  });

  it('contains the 8 threads, the 11 conclusions and the 76 sources of CONTEXTO_PISTAS.md (E6)', () => {
    expect(clues.threads.map((t) => t.id)).toEqual([
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'H7',
      'H8',
    ]);
    expect(clues.conclusions.map((c) => c.id)).toEqual([
      'K1',
      'K2',
      'KC',
      'K3',
      'K4',
      'K5',
      'K6',
      'K7',
      'K8',
      'K9',
      'K10',
    ]);
    expect(graph).toHaveLength(76);
  });

  it('inverts K1: the Laboratory is a place where time runs fast (E6, plan de finales §5)', () => {
    expect(clues.conclusions.find((c) => c.id === 'K1')?.title).toMatch(/deprisa/);
    expect(clues.facts.get('lab.existe_lugar_lento')?.line).toMatch(/deprisa/);
  });

  it('makes the loop essential (K9) and teaches the fallen gates outside the Laboratory (K10, rule 7)', () => {
    const k9 = clues.conclusions.find((c) => c.id === 'K9');
    expect(k9?.thread).toBe('H1');
    expect(k9?.requires).toEqual([['bucle.camara'], ['bucle.fuente_poder']]);
    expect(clues.conclusions.find((c) => c.id === 'K10')?.thread).toBe('H3');
    expect(checkLabCloses(clues, 'K10', 'laboratorio')).toEqual([]);
    expect(checkLabCloses(clues, 'K9', 'laboratorio')).toEqual([]);
  });

  it('keeps Them two (H8) outside the essential path and retires the facts of the three who stayed', () => {
    const essential = new Set(clues.conclusions.flatMap((c) => c.requires.flat()));
    const them = [...clues.facts.values()].filter((f) => f.threads[0] === 'H8');

    expect(them.map((f) => f.id).sort()).toEqual([
      'ellos.el_vive',
      'ellos.ella_congelada',
      'ellos.querian_lo_mismo',
      'ellos.se_amaban',
      'ellos.se_separaron',
    ]);
    expect(them.some((f) => essential.has(f.id))).toBe(false);
    for (const gone of ['silencio.uno_se_quedo', 'silencio.no_cruzaron'])
      expect(clues.facts.has(gone), gone).toBe(false);
  });

  it('creates the new facts of the plan and gives each one a source', () => {
    const given = new Set(
      clues.sources.flatMap((s) => [...s.surface.facts, ...(s.deep?.facts ?? [])]),
    );
    for (const id of [
      'bucle.horizonte_tarde',
      'bocas.arrastre',
      'casa.motor_energia',
      'contrapeso.contra_gravedad',
      'contrapeso.necesita_bucle',
      'partida.portales_caidos',
    ]) {
      expect(clues.facts.has(id), id).toBe(true);
      expect(given.has(id), id).toBe(true);
    }
  });

  it('spreads the sources over the places of the document', () => {
    const perWorld = new Map<string, number>();
    for (const s of graph) perWorld.set(s.world, (perWorld.get(s.world) ?? 0) + 1);

    expect(Object.fromEntries(perWorld)).toEqual({
      hogar: 7,
      luna: 1,
      umbral: 16,
      archivo: 12,
      taller: 11,
      cicatriz: 16,
      observatorio: 3,
      laboratorio: 7,
      puertas: 3,
    });
  });

  it('has a readable draft text in every source: no skeleton is left (milestone T3)', () => {
    // Todo texto es todavía un borrador para Anthony, pero ya se lee: ninguno queda como «[texto pendiente]».
    expect(clues.sources.every((s) => s.draft)).toBe(true);
    for (const source of clues.sources) {
      const paragraphs = [...source.surface.text, ...(source.deep?.text ?? [])];
      expect(paragraphs.length, source.id).toBeGreaterThan(0);
      for (const paragraph of paragraphs)
        expect(paragraph, source.id).not.toContain('[texto pendiente]');
    }
  });

  it('every recording carries the clock it was recorded with', () => {
    const recordings = clues.sources.filter((s) => s.kind === 'grabacion');

    expect(recordings.length).toBeGreaterThan(0);
    for (const recording of recordings) expect(recording.recordedRate).toBeGreaterThan(0);
  });

  it('every recording can be understood with the speed wheel', () => {
    for (const recording of clues.sources.filter((s) => s.kind === 'grabacion')) {
      const speed = 1 / (recording.recordedRate ?? 1);
      expect(speed, recording.id).toBeGreaterThanOrEqual(MIN_SPEED);
      expect(speed, recording.id).toBeLessThanOrEqual(MAX_SPEED);
    }
  });

  it('the skeptic recorded inside the bubble of the Counterweight: it sounds fast (E2)', () => {
    // Antes 0,20 (el Sitio Lento): se oía arrastrada y se entendía a ×5; ahora se entiende a ×0,2.
    expect(clues.sourceById.get('cicatriz.grabacion_esceptico')?.recordedRate).toBe(BUBBLE.bench);
  });

  it('explains every conclusion: what I now know, what to do and the question while it is missing', () => {
    for (const conclusion of clues.conclusions) {
      expect(conclusion.knowLine, conclusion.id).toBeTruthy();
      expect(conclusion.action, conclusion.id).toBeTruthy();
      expect(conclusion.question, conclusion.id).toBeTruthy();
    }
  });

  it('gives a vague lead to every fact a conclusion needs (never the place itself)', () => {
    const needed = clues.conclusions
      .flatMap((c) => c.requires.flat())
      .filter((id) => clues.facts.has(id));
    for (const id of needed) expect(clues.facts.get(id)?.lead, id).toBeTruthy();
  });

  it('does not give away the hour of the alignment at the Observatory telescope', () => {
    const telescope = clues.sourceById.get('observatorio.telescopio');
    expect(telescope?.surface.text.join(' ')).not.toMatch(/6:30|seis y media/);
  });

  it('leaves the place of the installation to Scar: the factory sequence only shows how', () => {
    const sequence = clues.sourceById.get('taller.secuencia');
    expect(sequence?.surface.facts).not.toContain('contrapeso.lugar');
    expect(sequence?.surface.facts).toContain('contrapeso.ventana_pulso');
  });

  it('tells, on the plans, that they are what the Institute is missing (an informed last choice)', () => {
    const plans = clues.sourceById.get('puertas.planos');
    expect(plans?.deep?.requires).toEqual(['casa.pruebas_menores', 'contrapeso.que_es']);
    expect(plans?.deep?.facts).toEqual(['casa.planos_completan']);
  });

  it('lets the archivist tell when the light comes through the slot', () => {
    const desk = clues.sourceById.get('archivo.escritorio');
    expect(desk?.surface.facts).toContain('archivo.hora_ranura');
  });
});
