// El colapso de Hogar diez años después (F5): la cronología de data/colapso-hogar.json y lo que se ve en cada momento.
import { describe, expect, it } from 'vitest';
import raw from '../../src/data/colapso-hogar.json';
import {
  advanceFree,
  COLLAPSE,
  collapseAt,
  collapseTimeline,
  parseCollapse,
  phaseAt,
  RED_RAMP,
  type CollapseTimeline,
} from '../../src/game/homeCollapse';
import { blackHoleRadius } from '../../src/system/blackHole';

const boca = collapseTimeline(COLLAPSE, 'boca');
const archivo = collapseTimeline(COLLAPSE, 'archivo');

/** Una copia de los datos con un cambio (para ver qué rechaza). */
function withChange(change: Record<string, unknown>): unknown {
  return { ...structuredClone(raw), ...change };
}

function eventOf(tl: CollapseTimeline, id: string) {
  const event = tl.events.find((e) => e.id === id);
  if (!event) throw new Error(`falta el evento ${id}`);
  return event;
}

describe('the chronology of the collapse at home', () => {
  it('reads the real data', () => {
    expect(COLLAPSE.arrival.boca).toBeGreaterThan(0);
    expect(COLLAPSE.arrival.archivo).toBeGreaterThan(0);
    expect(COLLAPSE.events.map((e) => e.id)).toEqual(['senales', 'pulso_cicatriz', 'cielo_rojo']);
  });

  it('leaves a minute or two to walk and recognise home before the scene', () => {
    for (const tl of [boca, archivo]) {
      const walk = tl.sceneStart - tl.arrivalEnd;
      expect(walk).toBeGreaterThanOrEqual(60);
      expect(walk).toBeLessThanOrEqual(150);
    }
  });

  it('starts each arrival in its own way but runs the same scene after it', () => {
    expect(boca.arrivalEnd).toBe(COLLAPSE.arrival.boca);
    expect(archivo.arrivalEnd).toBe(COLLAPSE.arrival.archivo);
    expect(boca.sceneStart - boca.arrivalEnd).toBe(archivo.sceneStart - archivo.arrivalEnd);
    expect(boca.end - boca.sceneStart).toBe(COLLAPSE.scene.duration);
  });

  it('shows the signals of every cycle in order: the bent light, the pulse, the red sky, the hole', () => {
    const order = ['senales', 'pulso_cicatriz', 'cielo_rojo', 'agujero_negro'].map(
      (id) => eventOf(boca, id).t,
    );

    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(eventOf(boca, 'senales').t).toBe(boca.signalsStart);
    expect(eventOf(boca, 'agujero_negro').t).toBe(boca.birth);
    expect(boca.birth).toBeGreaterThan(boca.sceneStart);
    // El agujero sigue hasta el final (la música y el rumor no se cortan antes de la tarjeta).
    const hole = eventOf(boca, 'agujero_negro');
    expect(hole.t + hole.duration).toBeCloseTo(boca.end, 6);
  });

  it('grows the hole from its birth and swallows Hogar and the Moon only after it is born', () => {
    expect(boca.growth.born).toBe(boca.birth);
    expect(boca.growth.maxRadius).toBe(COLLAPSE.hole.radius);
    expect(boca.absorption.hogar[0]).toBeGreaterThan(boca.birth);
    expect(boca.absorption.luna[0]).toBeGreaterThan(boca.birth);
    expect(boca.absorption.hogar[1]).toBeLessThanOrEqual(boca.end);
    expect(boca.fade[1]).toBeLessThanOrEqual(boca.end);
    // La Luna cae antes de que acabe Hogar (desde Hogar se la ve irse).
    expect(boca.absorption.luna[1]).toBeLessThan(boca.absorption.hogar[1]);
  });
});

describe('the phases of the visit', () => {
  it('goes arrival → roam → signals → collapse → card', () => {
    expect(phaseAt(boca, 0)).toBe('arrival');
    expect(phaseAt(boca, boca.arrivalEnd - 0.01)).toBe('arrival');
    expect(phaseAt(boca, boca.arrivalEnd)).toBe('roam');
    expect(phaseAt(boca, boca.signalsStart)).toBe('signals');
    expect(phaseAt(boca, boca.sceneStart)).toBe('collapse');
    expect(phaseAt(boca, boca.end)).toBe('card');
  });

  it('runs the free time only while the game runs, and stops at the scene', () => {
    const t = boca.arrivalEnd + 1;

    expect(advanceFree(boca, t, 0.5, true)).toBeCloseTo(t + 0.5, 9);
    expect(advanceFree(boca, t, 0.5, false)).toBe(t);
    expect(advanceFree(boca, t, -3, true)).toBe(t);
    expect(advanceFree(boca, boca.sceneStart - 0.1, 5, true)).toBe(boca.sceneStart);
    // Las escenas llevan su propio reloj: aquí no se mueve.
    expect(advanceFree(boca, 1, 0.5, true)).toBe(1);
    expect(advanceFree(boca, boca.sceneStart + 1, 0.5, true)).toBe(boca.sceneStart + 1);
  });
});

describe('what is seen at each moment', () => {
  it('is a calm, lit home while walking: no signals, no hole, the Gate open', () => {
    const view = collapseAt(boca, boca.arrivalEnd + 10);

    expect(view.phase).toBe('roam');
    expect(view.events).toEqual([]);
    expect(view.holeRadius).toBe(0);
    expect(view.red).toBe(0);
    expect(view.pulse).toBe(0);
    expect(view.gate).toBe(1);
    expect(view.absorbed).toEqual({ hogar: 0, luna: 0 });
  });

  it('bends the light first, then pulses and turns the sky red little by little', () => {
    const signals = eventOf(boca, 'senales');
    const pulse = eventOf(boca, 'pulso_cicatriz');
    const red = eventOf(boca, 'cielo_rojo');

    expect(collapseAt(boca, signals.t + 1).events).toEqual(['senales']);
    expect(collapseAt(boca, pulse.t + pulse.duration / 2).pulse).toBeCloseTo(1, 6);
    expect(collapseAt(boca, pulse.t + pulse.duration + 0.01).pulse).toBe(0);
    expect(collapseAt(boca, red.t).red).toBe(0);
    expect(collapseAt(boca, red.t + RED_RAMP / 2).red).toBeCloseTo(0.5, 6);
    expect(collapseAt(boca, red.t + RED_RAMP * 2).red).toBe(1);
  });

  it('closes the Gate as the hole is born in its throat, and grows it as the system does', () => {
    expect(collapseAt(boca, boca.birth - 2).gate).toBe(1);
    expect(collapseAt(boca, boca.birth + 3).gate).toBe(0);
    expect(collapseAt(boca, boca.birth - 0.01).holeRadius).toBe(0);
    const later = boca.birth + 10;
    expect(collapseAt(boca, later).holeRadius).toBeCloseTo(blackHoleRadius(later, boca.growth), 9);
    expect(collapseAt(boca, boca.birth + 1).events).toContain('agujero_negro');
  });

  it('has swallowed Hogar and the Moon by the end, with the sky still red', () => {
    const view = collapseAt(boca, boca.end - 0.01);

    expect(view.absorbed).toEqual({ hogar: 1, luna: 1 });
    expect(view.red).toBe(1);
    expect(view.holeRadius).toBeGreaterThan(0);
  });
});

describe('the data is checked when read', () => {
  it('rejects broken files with a clear message', () => {
    expect(() => parseCollapse(null)).toThrow(/colapso/);
    expect(() => parseCollapse(withChange({ paseo: -1 }))).toThrow(/paseo/);
    expect(() => parseCollapse(withChange({ llegada: { boca: 10 } }))).toThrow(/llegada/);
    expect(() =>
      parseCollapse(withChange({ eventos: [{ id: 'agujero_negro', t: 0, duracion: 3 }] })),
    ).toThrow(/agujero_negro/);
    expect(() =>
      parseCollapse(withChange({ eventos: [{ id: 'senales', t: 500, duracion: 3 }] })),
    ).toThrow(/senales/);
    expect(() => parseCollapse(withChange({ agujero: { nace: 80, crece: 10, radio: 4 } }))).toThrow(
      /agujero/,
    );
    expect(() =>
      parseCollapse(withChange({ absorcion: { hogar: [1, 2], luna: [30, 35] } })),
    ).toThrow(/hogar/);
    expect(() => parseCollapse(withChange({ fundido: [50, 40] }))).toThrow(/fundido/);
  });
});
