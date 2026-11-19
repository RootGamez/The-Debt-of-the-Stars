// F2: La Boca de Umbral contesta la llamada a las 10:00 (600 s del ciclo) y se abre unos 20 s como una esfera de
// gusano. A pie, junto a ella, aparece el aviso «E · cruzar La Boca»; E la cruza y lleva a Hogar años después,
// el final malo por La Boca (`?mundo=hogar&final=tarde&via=boca`).
import { expect, test } from '@playwright/test';
import { startPlaying } from './helpers';

test('La Boca opens at 10:00 and crossing it leads to the late ending', async ({ page }) => {
  test.setTimeout(180_000);
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.teleportTo?.('umbral.boca') ?? false)).toBe(
    true,
  );

  // Antes de las 10:00 está cerrada: no hay nada que cruzar.
  await expect(page.locator('.prompt')).not.toHaveText('E · cruzar La Boca');

  // Mirando al suelo la fuente de La Boca no tapa el aviso de cruzarla (el de la fuente va primero).
  await page.evaluate(() => (window.__juego as { pitch?: (v: number) => void }).pitch?.(-1.4));
  await page.evaluate(() => window.__juego?.skipTo?.(601));
  await expect(page.locator('.prompt')).toHaveText('E · cruzar La Boca', { timeout: 30_000 });

  await page.keyboard.press('KeyE');
  await page.waitForURL(/final=tarde/, { waitUntil: 'commit', timeout: 90_000 });
  expect(page.url()).toContain('mundo=hogar');
  expect(page.url()).toContain('via=boca');
});
