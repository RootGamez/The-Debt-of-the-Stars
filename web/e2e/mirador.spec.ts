// F3: el Mirador (final bueno). Con `?mundo=umbral&escena=mirador` los dos Ausentes están en el banco; la escena
// dura unos 130 s y acaba en la tarjeta del final A. Con `?debug`, `miradorSeek` salta a ese segundo.
import { expect, test } from '@playwright/test';
import { debugCall } from './helpers';

test('the Mirador scene plays and ends in the card of the good ending', async ({ page }) => {
  test.setTimeout(180_000);
  // La escena empieza sola y esconde la pausa: no hay clic que dar ni `ready` que esperar.
  await page.goto('/?debug&mundo=umbral&escena=mirador');
  const mirador = () => debugCall<{ time: number; shot: string; done: boolean }>(page, 'mirador');
  await expect
    .poll(async () => (await mirador())?.time ?? -Infinity, { timeout: 90_000 })
    .toBeGreaterThan(0.2);
  expect((await mirador())?.done).toBe(false);

  await debugCall(page, 'miradorSeek', 130);
  const card = page.getByRole('dialog', { name: 'Tres días después' });
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.getByRole('button', { name: 'Volver a jugar' })).toBeFocused();
});
