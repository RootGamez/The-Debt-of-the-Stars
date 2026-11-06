// El telescopio del Observatorio (🟡): durante la alineación se abre su ocular, un campo de cielo vivo en el que se
// puede mover la vista, acercarla y girar el índice de latón.
import { expect, test } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

test('the telescope opens an eyepiece onto the live sky during the alignment', async ({ page }) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.warpTo?.('observatorio') ?? false)).toBe(true);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 15_000 }).toBe(true);
  await page.evaluate(() => window.__juego?.skipTo?.(395));
  await page.evaluate(() => window.__juego?.teleportTo?.('observatorio.telescopio'));

  await page.keyboard.press('KeyE');

  const field = page.locator('canvas.ocular-field');
  await expect(field).toBeVisible();
  const readout = page.locator('.ocular-readout');
  await expect(readout).toContainText('Índice: 0°');
  await page.keyboard.press(']');
  await page.keyboard.press('+');
  await expect(readout).toContainText('Índice: 1°');
  await expect(readout).toContainText('Aumento ×2');
});
