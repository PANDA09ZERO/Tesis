import { test, expect, type Page } from '@playwright/test';
async function login(page: Page, id = 1) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`user${id}@test.local`);
  await page.locator('input[type=password]').fill('originalTest');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/login$/);
}
async function seed(page: Page) {
  const login = await page.request.post('/api/auth/login', { data: { email: 'user1@test.local', password: 'originalTest' } });
  expect(login.status()).toBe(200);
  const headers = { Authorization: 'Bearer ' + (await login.json()).data.token };
  const ids: number[] = [];
  for (const [day, time, room] of [['Lunes','15:00','UI-Tarde'], ['Lunes','13:00','UI-Temprano'], ['Miercoles','13:00','UI-Miercoles']]) {
    const r = await page.request.post('/api/horarios', { headers, data: { periodo_grado_curso_id: 1, profesor_id: 1, dia_semana: day, hora_inicio: time, hora_fin: time.slice(0,2) + ':45', aula: room } });
    expect(r.status()).toBe(201); ids.push((await r.json()).data.id);
  }
  return { headers, ids };
}
for (const account of [{ id: 1, name: 'administrador', url: '/horarios' }, { id: 2, name: 'profesor', url: '/horarios' }, { id: 11, name: 'alumno', url: '/estudiante/horarios' }]) {
  test(`horarios: interfaz, filtros y consulta de ${account.name}`, async ({ page }, info) => {
    const fixture = await seed(page);
    try {
      await login(page, account.id); await page.goto(account.url);
      const summary = page.getByRole('region', { name: 'Resumen de horarios' });
      await expect(summary).toContainText('3');
      const monday = page.getByRole('region', { name: 'Clases del Lunes', exact: true });
      await expect(monday.getByRole('article')).toHaveCount(2);
      await expect(monday.getByRole('article').first()).toContainText('13:00–13:45');
      const days = page.getByRole('navigation', { name: 'Días del horario' });
      await days.getByRole('button', { name: 'Miércoles', exact: true }).click();
      await expect(page.getByRole('article')).toHaveCount(1);
      await expect(summary).toContainText('1');
      await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
      await page.getByRole('searchbox', { name: 'Buscar en horarios' }).fill('temprano');
      await expect(page.getByRole('article')).toHaveCount(1);
      await expect(page.getByRole('article')).toContainText('UI-Temprano');
      await page.getByRole('searchbox', { name: 'Buscar en horarios' }).fill('inexistente');
      await expect(page.getByRole('status').filter({ hasText: 'Sin clases para estos filtros.' })).toBeVisible();
      await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
      await page.screenshot({ path: info.outputPath('horarios-claro.png'), fullPage: true, animations: 'disabled' });
      await page.getByRole('button', { name: 'Cambiar a tema oscuro', exact: true }).click();
      await page.screenshot({ path: info.outputPath('horarios-oscuro.png'), fullPage: true, animations: 'disabled' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await expect(page.getByRole('button', { name: 'Nuevo horario', exact: true })).toHaveCount(account.id === 1 ? 1 : 0);
      await expect(page.getByRole('button', { name: 'Editar horario', exact: true })).toHaveCount(account.id === 1 ? 3 : 0);
      if (account.id === 1) {
        await monday.getByRole('article').first().getByRole('button', { name: 'Editar horario', exact: true }).click();
        await expect(page.getByText('Docente asignado:', { exact: false })).toBeVisible();
        await page.getByRole('textbox', { name: 'Aula', exact: true }).fill('UI-Editada');
        await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
        await expect(monday.getByRole('article').first()).toContainText('UI-Editada');
        await page.screenshot({ path: info.outputPath('horarios-editado.png'), fullPage: true, animations: 'disabled' });
        page.once('dialog', d => d.accept());
        await monday.getByRole('article').first().getByRole('button', { name: 'Eliminar horario', exact: true }).click();
        await expect(monday.getByRole('article')).toHaveCount(1);
      }
      const period = page.getByRole('combobox', { name: account.id === 11 ? 'Periodo académico' : 'Periodo académico de consulta', exact: true });
      await period.selectOption('2');
      await expect(page.getByRole('status').filter({ hasText: account.id === 11 ? 'Sin horarios asociados a tus matrículas' : 'No hay horarios para el periodo seleccionado.' })).toBeVisible();
      if (info.project.name === 'mobile') { await page.setViewportSize({ width: 320, height: 740 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
    } finally {
      for (const id of fixture.ids) { const result = await page.request.delete('/api/horarios/' + id, { headers: fixture.headers }); expect([200,404]).toContain(result.status()); }
    }
  });
}
test('horarios: fallos visibles, reintento y formulario conservado', async ({ page }) => {
  await login(page);
  const pattern = '**/api/horarios?*';
  await page.route(pattern, route => route.fulfill({ status: 500, json: { success: false, message: 'Fallo de horarios de prueba' } }));
  await page.goto('/horarios');
  await expect(page.getByRole('alert').filter({ hasText: 'Fallo de horarios de prueba' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo horario', exact: true })).toBeDisabled();
  await page.unroute(pattern); await page.getByRole('button', { name: 'Reintentar horarios' }).click();
  await page.getByRole('button', { name: 'Nuevo horario', exact: true }).click();
  await expect(page.getByText('Docente asignado:', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: 'Aula', exact: true }).fill('Conservar');
  await page.getByLabel('Hora fin', { exact: true }).fill('07:00');
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'La hora de fin debe ser posterior' })).toBeVisible();
  await page.getByLabel('Hora fin', { exact: true }).fill('09:00');
  await page.route('**/api/horarios', route => route.request().method() === 'POST' ? route.fulfill({ status: 409, json: { success: false, message: 'Conflicto de horario de prueba' } }) : route.continue());
  await page.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Conflicto de horario de prueba' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Aula', exact: true })).toHaveValue('Conservar');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
});
