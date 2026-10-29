// Fase 8 (hito 8D): el final desde el palco. En el Observatorio, el último en caer, la marea del agujero se nota
// pero no mata; en el último tramo de su ventana el horizonte llena el cielo, todo se oscurece, el rumor del
// agujero llega al máximo y calla, y el fundido de la Cámara reinicia el ciclo.
import { expect, test, type Page } from '@playwright/test';
import { loopValue, snapshot, startPlaying } from './helpers';

interface Seen {
  span: number;
  tide: number;
  strain: number;
  rumble: number;
  causes: string[];
  /** El volumen general llegó a 0 mientras moría (antes del reinicio). */
  silentWhileDying: boolean;
}

function rumble(page: Page) {
  return page.evaluate(() => window.__juego?.audio?.().levels['evento:agujero_negro'] ?? 0);
}

/** Registra en la página lo que pasa en cada fotograma (no depende de cuándo sondea la prueba). */
async function watchTheEnd(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: Seen = {
      span: 0,
      tide: 0,
      strain: 0,
      rumble: 0,
      causes: [],
      silentWhileDying: false,
    };
    (window as unknown as { __final: Seen }).__final = seen;
    const look = (): void => {
      const game = window.__juego;
      const loop = game?.snapshot()?.loop;
      const hole = game?.blackHole?.();
      const tide = game?.tide?.();
      const audio = game?.audio?.();
      seen.span = Math.max(seen.span, hole?.span ?? 0);
      seen.tide = Math.max(seen.tide, tide?.tide ?? 0);
      seen.strain = Math.max(seen.strain, tide?.strain ?? 0);
      seen.rumble = Math.max(seen.rumble, audio?.levels['evento:agujero_negro'] ?? 0);
      if (loop?.cause && !seen.causes.includes(loop.cause)) seen.causes.push(loop.cause);
      if (loop?.phase === 'dying' && audio?.master === 0) seen.silentWhileDying = true;
      if ((loop?.loops ?? 0) === 0) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}

test('from the palco the horizon fills the sky, all goes quiet and the loop starts again', async ({
  page,
}) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.warpTo?.('observatorio') ?? false)).toBe(true);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 15_000 }).toBe(true);

  await page.evaluate(() => window.__juego?.skipTo?.(860));
  await expect.poll(() => rumble(page)).toBeGreaterThan(0);
  const earlier = await rumble(page);

  // Dentro de su ventana (14:45–15:00), a algo más de la mitad: falta por ver lo mejor.
  await page.evaluate(() => window.__juego?.skipTo?.(893));
  await watchTheEnd(page);

  await expect.poll(() => loopValue(page, 'loops'), { timeout: 45_000 }).toBe(1);
  const seen = await page.evaluate(() => (window as unknown as { __final: Seen }).__final);
  expect(seen.span).toBeGreaterThan(1); // más de 57° de radio: el horizonte llena el cielo
  expect(seen.tide).toBeGreaterThan(0.3); // la marea se nota…
  expect(seen.strain).toBe(0); // …pero en el palco no hace daño
  expect(seen.causes).toEqual(['absorcion']);
  expect(seen.rumble).toBeGreaterThan(earlier);
  expect(seen.silentWhileDying).toBe(true);

  // Despierta en el ciclo siguiente: sin agujero y con la luz de vuelta.
  await expect.poll(() => loopValue(page, 'phase'), { timeout: 10_000 }).toBe('playing');
  expect(await page.evaluate(() => window.__juego?.blackHole?.().visible)).toBe(false);
});
