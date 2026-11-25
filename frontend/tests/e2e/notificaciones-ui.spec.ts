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

test('avisos: una incidencia nueva suma al contador de la sección y avisa al apoderado', async ({ page }, info) => {
  test.setTimeout(60_000);
  const mobile = info.project.name === 'mobile';
  const descripcion = `Incidente de prueba ${info.project.name} ${Date.now()}`;
  let id: number | undefined;
  await login(page, 1);
  const headers = { Authorization: 'Bearer ' + await page.evaluate(() => localStorage.getItem('token')) };
  try {
    const created = await page.request.post('/api/incidencias', { headers, data: { alumno_id: 1, fecha: '2026-10-14', tipo: 'conducta', gravedad: 'leve', descripcion } });
    expect(created.status()).toBe(201);
    id = (await created.json()).data.id;
    const pendientes = (await (await page.request.get('/api/notificaciones/no-leidas', { headers })).json()).data.secciones.incidencias;
    expect(pendientes).toBeGreaterThan(0);

    await page.goto('/dashboard');
    if (mobile) {
      // En celular el contador va en "Módulos" (barra inferior) y en la tarjeta de Incidencias.
      const modules = page.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('button', { name: 'Módulos', exact: true });
      await expect(modules).toHaveAccessibleDescription(/\d+ pendientes?/);
      await modules.click();
      await expect(page.locator('.modules-catalog a[href="/incidencias"]')).toHaveAccessibleName(`Incidencias: ${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}`);
    } else {
      const sidebar = page.getByRole('complementary', { name: 'Navegación principal' });
      await expect(sidebar.locator('a[href="/incidencias"]')).toContainText(String(pendientes));
    }

    // El apoderado del alumno recibe la notificación, con enlace a la pestaña Conducta.
    await login(page, 21);
    await page.goto('/familia/notificaciones');
    await expect(page.getByText('Incidencia de conducta: Usuario 11', { exact: true }).first()).toBeVisible();
  } finally {
    if (id) {
      await login(page, 1);
      const admin = { Authorization: 'Bearer ' + await page.evaluate(() => localStorage.getItem('token')) };
      expect((await page.request.put(`/api/incidencias/${id}/estado`, { headers: admin, data: { estado: 'cerrada', resolucion: 'Prueba automática' } })).status()).toBe(200);
    }
  }
});
