import { test, expect } from '@playwright/test';

test('diálogos: vista de imagen y formulario separados de los bordes', async ({ page }, info) => {
  // Use a real local image to test layout independently of the binary download fixture.
  await page.addInitScript(() => { URL.createObjectURL = () => '/assets/logo.png'; });
  await page.goto('/login');
  await page.locator('input[type=email]').fill('user1@test.local');
  await page.locator('input[type=password]').fill('originalTest');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await page.getByRole('button', { name: 'Cambiar a tema oscuro', exact: true }).click();
  await page.goto('/documentos');
  await page.route('**/api/documentos/*/archivo', async route => {
    await route.fulfill({ contentType: 'image/png', body: '' });
  });
  if (info.project.name === 'mobile') await page.locator('.mobile-bento-card').first().locator('summary').click();
  await page.getByRole('button', { name: 'Ver archivo', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  const image = dialog.locator('img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  for (const dimensions of [{ width: 320, height: 740 }, { width: 740, height: 360 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(dimensions);
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(15);
    expect(bounds!.x).toBeGreaterThanOrEqual(15);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(dimensions.height - 15);
    const picture = await image.boundingBox();
    expect(picture!.y + picture!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height - 10);
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 393, height: 851 });
  await page.screenshot({ path: info.outputPath('visor-centrado.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Cerrar ventana' }).click();
  await page.goto('/admin/usuarios');
  await page.getByRole('button', { name: 'Nuevo Usuario', exact: true }).click();
  const form = page.getByRole('dialog');
  await expect(form).toBeVisible();
  const bounds = await form.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(15);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(851 - 15);
  await expect(form.getByRole('button', { name: 'Cerrar ventana' })).toBeInViewport();
});
