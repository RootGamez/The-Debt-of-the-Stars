// Constantes del ciclo (plan de la Fase 3; decisiones en CONTEXTO_HISTORIA.md §8).
import type { TimeMode } from '../core/loopClock';

/** ✅ Modo B (Anthony, 2026-10-25): el tiempo real es el del jugador; fuera corre más rápido en
 * mundos lentos. 'reference' = modo A, se deja para probar. */
export const TIME_MODE: TimeMode = 'player';

/** Impacto contra el suelo a partir del cual se muere (m/s). */
export const FALL_DEATH_SPEED = 20;

/** Fundido a blanco al morir y desde negro al despertar (s reales). */
export const FADE_OUT_SECONDS = 2;
export const FADE_IN_SECONDS = 1.5;
