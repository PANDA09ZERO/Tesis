import { test, expect, type Page } from '@playwright/test';
import { openCards } from './helpers';

async function login(page: Page, id: number) {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`user${id}@test.local`);
  await page.locator('input[type=password]').fill('originalTest');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/login$/);
}

test('notificaciones: se envía a una persona concreta y solo ella la recibe', async ({ page }, info) => {
  test.setTimeout(90_000);
  const title = `Aviso para la familia ${info.project.name} ${Date.now()}`;
  let id: number | undefined;
  await login(page, 1);
  const token = await page.evaluate(() => localStorage.getItem('token'));
  try {
    await page.goto('/admin/notificaciones');
    await page.getByRole('button', { name: 'Nueva', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nueva Notificación' });
    await dialog.locator('input[type=text]').first().fill(title);
    await dialog.locator('textarea').fill('Reunión de padres el viernes a las 6 p. m.');

    // Sin destinatario no se envía: antes se guardaba sin dueño y no la recibía nadie.
    await dialog.getByRole('button', { name: 'Enviar notificación', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Elige a la persona');

    await dialog.getByRole('searchbox', { name: 'Buscar destinatario' }).fill('user21');
    await dialog.getByRole('button', { name: 'Elegir a Usuario 21', exact: true }).click();
    await expect(dialog.getByRole('group', { name: 'Destinatario *' })).toContainText('Apoderado · user21@test.local');
    await page.screenshot({ path: info.outputPath('notificacion-destinatario.png'), fullPage: true, animations: 'disabled' });

    const created = page.waitForResponse(r => r.url().endsWith('/api/notificaciones') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Enviar notificación', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    id = (await response.json()).data.id;
    await expect(dialog).toHaveCount(0);

    // La recibe el apoderado elegido: la campana muestra el pendiente y la ve en "Mis notificaciones".
    await login(page, 21);
    await expect(page.getByRole('button', { name: /^Notificaciones: \d+ pendientes?$/ })).toBeVisible();
    await page.goto('/familia/notificaciones');
    await expect(page).toHaveURL(/familia\/notificaciones$/);
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();

    // Responde desde la conversación.
    const reply = (name: string) => page.getByRole('button', { name: `Ver y responder: ${name}`, exact: true });
    await expect(async () => { await openCards(page); await reply(title).click({ timeout: 2000 }); }).toPass({ timeout: 15000 });
    const thread = page.getByRole('dialog', { name: title });
    await expect(thread.getByRole('region', { name: 'Mensaje original' })).toContainText('Reunión de padres');
    await thread.getByRole('button', { name: 'Enviar respuesta', exact: true }).click();
    await expect(thread.getByRole('alert')).toContainText('Escribe tu respuesta');
    await thread.getByLabel('Tu respuesta', { exact: true }).fill('Ahí estaré, gracias.');
    await thread.getByRole('button', { name: 'Enviar respuesta', exact: true }).click();
    await expect(thread.getByRole('region', { name: 'Respuestas' })).toContainText('Ahí estaré, gracias.');
    await expect(thread.getByRole('region', { name: 'Respuestas' })).toContainText('Tú · Apoderado');
    await page.screenshot({ path: info.outputPath('notificacion-respuesta.png'), fullPage: true, animations: 'disabled' });
    await page.keyboard.press('Escape');

    // La administración ve la respuesta nueva, la abre y contesta.
    await login(page, 1);
    await expect(page.getByRole('button', { name: /^Notificaciones: \d+ pendientes?$/ })).toBeVisible();
    await page.goto('/admin/notificaciones');
    await page.getByPlaceholder('Buscar notificación...').fill(title);
    await expect(async () => { await openCards(page); await expect(page.getByText('Respuesta nueva', { exact: true }).first()).toBeVisible({ timeout: 1000 }); }).toPass({ timeout: 15000 });
    await expect(async () => { await openCards(page); await reply(title).click({ timeout: 2000 }); }).toPass({ timeout: 15000 });
    const adminThread = page.getByRole('dialog', { name: title });
    await expect(adminThread.getByRole('region', { name: 'Respuestas' })).toContainText('Usuario 21 · Apoderado');
    await adminThread.getByLabel('Tu respuesta', { exact: true }).fill('Perfecto, lo esperamos.');
    await adminThread.getByRole('button', { name: 'Enviar respuesta', exact: true }).click();
    await expect(adminThread.getByRole('region', { name: 'Respuestas' })).toContainText('Perfecto, lo esperamos.');

    // Al apoderado le vuelve a aparecer como pendiente.
    await login(page, 21);
    await expect(page.getByRole('button', { name: /^Notificaciones: \d+ pendientes?$/ })).toBeVisible();

    // Otra persona no la ve.
    await login(page, 11);
    await page.goto('/estudiante/notificaciones');
    await expect(page.getByRole('heading', { name: 'Centro de Notificaciones' })).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  } finally {
    if (id) expect((await page.request.delete(`/api/notificaciones/${id}`, { headers: { Authorization: 'Bearer ' + token } })).status()).toBe(200);
  }
});
