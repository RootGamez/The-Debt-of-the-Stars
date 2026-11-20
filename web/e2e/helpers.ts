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
  await expect(page.locator('.overlay')).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => value(page, 'grounded'), { timeout: 60_000 }).toBe(true);
}

/**
 * Cierra la lectura o charla abierta como un jugador: cada E completa la frase o pasa a la siguiente, y en la
 * última cierra. Se mira después de cada pulsación para no volver a abrirla con una E de más.
 */
export async function closeReader(page: Page): Promise<void> {
  const reader = page.locator('.reader');
  for (let presses = 0; presses < 60 && (await reader.isVisible()); presses++) {
    await page.keyboard.press('KeyE');
  }
  await expect(reader).toBeHidden();
}

export async function startPlaying(page: Page, query = ''): Promise<void> {
  await ready(page, query);
  await page.locator('.overlay').click({ position: { x: 20, y: 20 } });
  await expect(page.locator('.overlay')).toBeHidden();
  await expect.poll(() => value(page, 'playing'), { timeout: 20_000 }).toBe(true);
}

/**
 * Llama a una función de `window.__juego` que no tiene tipo en `debugOverlay.ts` (las de las cinemáticas: `mirador`,
 * `homeEarlier`, `homeLater`…) y devuelve lo que dé (null si no existe).
 */
export async function debugCall<T = unknown>(
  page: Page,
  name: string,
  ...args: number[]
): Promise<T | null> {
  return page.evaluate(
    ({ fn, values }) => {
      const api = window.__juego as unknown as
        Record<string, ((...a: number[]) => unknown) | undefined> | undefined;
      return (api?.[fn]?.(...values) ?? null) as never;
    },
    { fn: name, values: args },
  );
}

/**
 * Empieza a apuntar en la página cada aviso (`.notice`) que se muestra. El aviso se apaga a los 4,5 s reales y, con
 * WebGL por software, un fotograma puede tardar segundos: mirándolo desde la prueba se podía perder entero.
 */
export async function watchNotices(page: Page): Promise<void> {
  await page.evaluate(() => {
    const store = window as unknown as { __notices?: string[] };
    if (store.__notices) return;
    const seen: string[] = [];
    store.__notices = seen;
    const element = document.querySelector('.notice');
    if (!element) return;
    new MutationObserver(() => {
      const text = element.textContent;
      if (text) seen.push(text);
    }).observe(element, { childList: true, characterData: true, subtree: true });
  });
}

/** Los avisos que se han mostrado desde `watchNotices`, juntos (para `toContain`). */
export async function noticesSeen(page: Page): Promise<string> {
  return page.evaluate(
    () => (window as unknown as { __notices?: string[] }).__notices?.join('\n') ?? '',
  );
}
