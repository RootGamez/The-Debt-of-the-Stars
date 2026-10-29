// Fase 7 (hito 7C): la imagen del Nudo se ve girada 18° hacia la Brasa; con claridad solo desde el
// Observatorio durante la alineación (6:30–7:30). La mira graduada (G) mide ángulos en pantalla.
import { expect, test, type Page } from '@playwright/test';
import { snapshot, startPlaying } from './helpers';

function lens(page: Page) {
  return page.evaluate(() => window.__juego?.lens?.() ?? null);
}

test('the image of the Nudo is turned toward the Brasa and only flickers far from the Observatorio', async ({
  page,
}) => {
  await startPlaying(page);

  await expect.poll(async () => (await lens(page))?.offsetDegrees ?? null).not.toBeNull();
  const seen = await lens(page);
  expect(seen?.offsetDegrees).toBeCloseTo(18, 3);
  expect(seen?.clarity ?? 1).toBeLessThan(0.35);
});

test('from the Observatorio, during the alignment, the image is sharp', async ({ page }) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.warpTo?.('observatorio') ?? false)).toBe(true);
  await expect.poll(async () => (await snapshot(page))?.grounded, { timeout: 15_000 }).toBe(true);
  expect((await lens(page))?.clarity ?? 1).toBeLessThan(0.35);

  await page.evaluate(() => window.__juego?.skipTo?.(400));

  await expect.poll(async () => (await lens(page))?.clarity).toBe(1);
  expect((await lens(page))?.visible).toBe(true);
});

test('up close the image gives way to the Nudo itself', async ({ page }) => {
  await startPlaying(page);
  expect(await page.evaluate(() => window.__juego?.warpTo?.('laboratorio') ?? false)).toBe(true);

  await expect.poll(async () => (await lens(page))?.clarity).toBe(0);
  expect((await lens(page))?.visible).toBe(false);
});

test('G shows and hides the graduated sight', async ({ page }) => {
  await startPlaying(page);
  const sight = page.locator('svg.sight');
  await expect(sight).toBeHidden();

  await page.keyboard.press('KeyG');

  await expect(sight).toBeVisible();
  await expect(sight.locator('text')).toContainText(['10°', '20°']);
  await page.keyboard.press('KeyG');
  await expect(sight).toBeHidden();
});
