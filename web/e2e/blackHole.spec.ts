// Fase 8 (hito 8A): el agujero negro nace a las 13:30 en Cicatriz y crece; antes no existe.
import { expect, test, type Page } from '@playwright/test';
import { startPlaying } from './helpers';

function hole(page: Page) {
  return page.evaluate(() => window.__juego?.blackHole?.() ?? null);
}

function lens(page: Page) {
  return page.evaluate(() => window.__juego?.lens?.() ?? null);
}

test('there is no black hole before 13:30', async ({ page }) => {
  await startPlaying(page);

  await expect.poll(async () => (await hole(page))?.visible).toBe(false);
  expect((await hole(page))?.radius).toBe(0);
});

test('the black hole is born at 13:30 and keeps growing', async ({ page }) => {
  await startPlaying(page);
  await page.evaluate(() => window.__juego?.skipTo?.(812));

  await expect.poll(async () => (await hole(page))?.visible).toBe(true);
  const young = (await hole(page))?.radius ?? 0;
  expect(young).toBeGreaterThan(0);

  await page.evaluate(() => window.__juego?.skipTo?.(850));
  await expect.poll(async () => (await hole(page))?.radius ?? 0).toBeGreaterThan(young * 5);
});

// Hito 8B: el agujero dobla las estrellas, más cuanto más crece; con calidad baja no se dobla nada.
test('the black hole bends the stars more as it grows', async ({ page }) => {
  await startPlaying(page);

  expect((await lens(page))?.bending).toBe(true);
  expect((await lens(page))?.holeLens).toBe(0);

  await page.evaluate(() => window.__juego?.skipTo?.(812));
  await expect.poll(async () => (await lens(page))?.holeLens ?? 0).toBeGreaterThan(0);
  const young = (await lens(page))?.holeLens ?? 0;

  await page.evaluate(() => window.__juego?.skipTo?.(850));
  await expect.poll(async () => (await lens(page))?.holeLens ?? 0).toBeGreaterThan(young * 2);
});

test('with low quality the stars do not bend', async ({ page }) => {
  await startPlaying(page, '&calidad=baja');

  expect((await lens(page))?.bending).toBe(false);
});
