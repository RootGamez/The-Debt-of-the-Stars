// Utilidades compartidas de las pruebas de Playwright. Todas usan `?debug` para leer
// window.__juego.snapshot() y esperan condiciones en vez de tiempos fijos (WebGL por software es lento).
import { expect, type Page } from '@playwright/test';
import type { DebugSnapshot, LoopSnapshot } from '../src/ui/debugOverlay';

export async function snapshot(page: Page): Promise<DebugSnapshot | null> {
  return page.evaluate(() => window.__juego?.snapshot() ?? null);
}

export async function value<K extends keyof DebugSnapshot>(
  page: Page,
  key: K,
): Promise<DebugSnapshot[K] | null> {
  return (await snapshot(page))?.[key] ?? null;
}

export async function loopValue<K extends keyof LoopSnapshot>(
  page: Page,
  key: K,
): Promise<LoopSnapshot[K] | null> {
  return (await snapshot(page))?.loop[key] ?? null;
}

/**
 * Abre el juego con `?debug` (más parámetros opcionales) y espera a que el jugador esté de pie. Empieza en
 * Umbral salvo que la consulta pida otro mundo: una partida nueva sin `?mundo=` empezaría el prólogo en casa.
 */
export async function ready(page: Page, query = ''): Promise<void> {
  const world = query.includes('mundo=') ? '' : '&mundo=umbral';
  await page.goto(`/?debug${world}${query}`);
  await expect(page.locator('.overlay')).toBeVisible();
  await expect.poll(() => value(page, 'grounded'), { timeout: 20_000 }).toBe(true);
}

export async function startPlaying(page: Page, query = ''): Promise<void> {
  await ready(page, query);
  await page.locator('.overlay').click({ position: { x: 20, y: 20 } });
  await expect(page.locator('.overlay')).toBeHidden();
  await expect.poll(() => value(page, 'playing')).toBe(true);
}
