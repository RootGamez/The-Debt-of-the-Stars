import { describe, expect, it } from 'vitest';
import {
  BOCA_ASK_RADIUS,
  BOCA_CALL_DURATION,
  BOCA_CALL_START,
  bocaCallOpen,
  bocaCallStep,
} from '../../src/game/bocaCall';

describe('la llamada de La Boca (plan de los finales, F2)', () => {
  it('se abre a las 10:00 y dura unos 20 s (no los 3 del destello)', () => {
    expect(BOCA_CALL_START).toBe(600);
    expect(BOCA_CALL_DURATION).toBe(20);
    expect(bocaCallOpen(BOCA_CALL_START - 0.01)).toBe(false);
    expect(bocaCallOpen(BOCA_CALL_START)).toBe(true);
    expect(bocaCallOpen(BOCA_CALL_START + BOCA_CALL_DURATION - 0.01)).toBe(true);
    expect(bocaCallOpen(BOCA_CALL_START + BOCA_CALL_DURATION)).toBe(false);
  });

  it('cerrada no se ve ni se cruza, aunque se confirme', () => {
    expect(bocaCallStep(300, 1, true)).toBe('closed');
    expect(bocaCallStep(700, 1, true)).toBe('closed');
  });

  it('abierta y lejos solo se ve; cerca pregunta; solo cruza con confirmación', () => {
    expect(bocaCallStep(605, BOCA_ASK_RADIUS + 1, true)).toBe('visible');
    expect(bocaCallStep(605, BOCA_ASK_RADIUS - 0.5, false)).toBe('ask');
    expect(bocaCallStep(605, BOCA_ASK_RADIUS - 0.5, true)).toBe('cross');
  });
});
