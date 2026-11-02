import { test, expect, type Page, type TestInfo } from '@playwright/test';

async function login(page: Page, id = 1) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`user${id}@test.local`);
  await page.locator('input[type=password]').fill('originalTest');
  const signed = page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  expect((await signed).status()).toBe(200);
  await expect(page).not.toHaveURL(/login$/);
  await page.goto('/alumnos');
}
function student(page: Page, info: TestInfo, name: string) {
  return info.project.name === 'mobile'
    ? page.getByRole('article', { name, exact: true })
    : page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test('alumnos: tarjetas y detalle móvil, tabla de escritorio y tema neutro', async ({ page }, info) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Alumnos', exact: true })).toBeVisible();
  const record = student(page, info, 'Usuario 11');
  await expect(record).toContainText('Primero');
  await expect(record).toContainText('activa');
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('alumnos-claro.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cambiar a tema oscuro', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  const primary = record.getByRole('button', { name: 'Ver detalle de Usuario 11', exact: true });
  if (info.project.name === 'mobile') {
    await expect.poll(async () => {
      const background = await primary.evaluate(el => getComputedStyle(el).backgroundColor);
      const channels = background.match(/[\d.]+/g)!.map(Number);
      return channels[0] === channels[1] && channels[1] === channels[2];
    }).toBe(true);
    for (const button of await record.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: info.outputPath('alumnos-oscuro.png'), fullPage: true });
  await primary.click();
  await expect(page).toHaveURL(/alumnos\/1\?periodo_id=1$/);
  await expect(page.getByRole('heading', { name: 'Usuario 11', exact: true })).toBeVisible();
  await expect(page.getByText('Con matrícula registrada', { exact: true })).toBeVisible();
  const sections = page.getByRole('navigation', { name: 'Secciones del alumno' });
  if (info.project.name === 'mobile') {
    await sections.getByRole('button', { name: 'Calificaciones', exact: true }).click();
    await expect(page.locator('#student-notas')).toBeVisible();
    await expect(page.locator('#student-matricula')).not.toBeVisible();
    await sections.getByRole('button', { name: 'Asistencia', exact: true }).click();
    await expect(page.locator('#student-asistencia')).toBeVisible();
    await expect(page.locator('#student-notas')).not.toBeVisible();
    await sections.getByRole('button', { name: 'Matrícula y cursos', exact: true }).click();
  } else {
    await expect(sections).not.toBeVisible();
    await expect(page.locator('#student-notas')).toBeVisible();
    await expect(page.locator('#student-asistencia')).toBeVisible();
  }
  await expect(page.locator('#student-matricula')).toContainText('Actual');
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('alumno-detalle.png'), fullPage: true });
});

test('alumnos: error recuperable, búsqueda vacía y filtro de periodo', async ({ page }, info) => {
  const path = '**/api/alumnos?**';
  await page.route(path, route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Fallo sintético del listado' }) }));
  await login(page);
  await expect(page.getByRole('alert')).toContainText('Fallo sintético del listado');
  await page.unroute(path);
  await page.getByRole('button', { name: 'Reintentar alumnos', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'alumnos encontrados' })).toBeVisible();
  const search = page.getByPlaceholder('Buscar alumno...');
  await search.fill('NoExisteSintetico');
  await expect(page.getByText('No hay alumnos con matrícula en el periodo seleccionado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'alumnos encontrados' })).toBeVisible();
  const historical = page.waitForResponse(r => r.url().includes('/api/alumnos?') && new URL(r.url()).searchParams.get('periodo_id') === '2');
  await page.getByRole('combobox', { name: 'Periodo académico de consulta' }).selectOption('2');
  expect((await historical).status()).toBe(200);
  await expect(page.getByText(info.project.name==='mobile' ? 'Matrículas · Anterior' : 'Mostrando alumnos con matrícula en', { exact: false })).toContainText('Anterior');
});

test('alumnos: registrar sin matrícula, conservar error y editar datos que persiste la API', async ({ page }, info) => {
  await login(page);
  await page.getByRole('button', { name: 'Nuevo Alumno', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registrar Alumno', exact: true })).toBeVisible();
  await expect(page.getByText('El grado, periodo y cursos se establecen después al registrar la matrícula.', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Grado', exact: true })).toHaveCount(0);
  await page.getByLabel('Nombre *', { exact: true }).fill('PruebaInterfaz');
  await page.getByLabel('Apellido *', { exact: true }).fill('Alumno');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle de prueba 123');
  await expect(page.getByText('El usuario institucional se generará con el nombre y apellido del alumno.', { exact: false })).toBeVisible();
  const path = '**/api/alumnos';
  await page.route(path, route => route.request().method() === 'POST' ? route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Conflicto sintético de alumno' }) }) : route.continue());
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Conflicto sintético de alumno');
  await expect(page.getByRole('heading', { name: 'Registrar Alumno', exact: true })).toBeVisible();
  await page.unroute(path);
  const created = page.waitForResponse(r => r.url().endsWith('/api/alumnos') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  const response = await created; expect(response.status()).toBe(201);
  const result = (await response.json()).data;
  expect(result.credentials.email).toBe('pruebainterfaz.alumno@cienciaseingenieria.edu');
  expect(result.credentials.mustChangePassword).toBe(true);
  expect(result.credentials.mailboxCreated).toBe(false);
  await expect(page.getByRole('heading', { name: 'Credenciales creadas', exact: true })).toBeVisible();
  await expect(page.getByText(result.credentials.email, { exact: true })).toBeVisible();
  await expect(page.getByText(result.credentials.temporaryPassword, { exact: true })).toBeVisible();
  const firstLogin = await page.request.post('/api/auth/login', { data: { email: result.credentials.email, password: result.credentials.temporaryPassword } });
  expect(firstLogin.status()).toBe(200);
  const firstSession = (await firstLogin.json()).data;
  expect(firstSession.user.debe_cambiar_password).toBe(true);
  const firstAuth = { Authorization: `Bearer ${firstSession.token}` };
  expect((await page.request.get('/api/alumnos', { headers: firstAuth })).status()).toBe(403);
  const newPassword = 'Synthetic-New-Strong-2026';
  expect((await page.request.put('/api/auth/change-password', { headers: firstAuth, data: { currentPassword: result.credentials.temporaryPassword, newPassword } })).status()).toBe(200);
  const laterLogin = await page.request.post('/api/auth/login', { data: { email: result.credentials.email, password: newPassword } });
  expect(laterLogin.status()).toBe(200);
  expect((await laterLogin.json()).data.user.debe_cambiar_password).toBe(false);
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: 'Bearer ' + token };
  try {
    const data = await page.request.get(`/api/alumnos/${result.id}`, { headers });
    const profile = (await data.json()).data;
    expect(profile.matriculas_academicas).toHaveLength(0);
    expect(profile.direccion).toBe('Calle de prueba 123');
    await page.getByRole('combobox', { name: 'Periodo académico de consulta' }).selectOption('');
    await page.getByPlaceholder('Buscar alumno...').fill('PruebaInterfaz');
    const record = student(page, info, 'PruebaInterfaz Alumno').filter({ hasText: result.credentials.email });
    await expect(record).toBeVisible();
    await record.getByRole('button', { name: info.project.name === 'mobile' ? 'Editar a PruebaInterfaz Alumno' : 'Editar alumno', exact: true }).click();
    await expect(page.getByLabel('Nombre *', { exact: true })).toHaveAttribute('readonly', '');
    await page.getByLabel('Teléfono', { exact: true }).fill('987654321');
    const updated = page.waitForResponse(r => r.url().endsWith(`/api/alumnos/${result.id}`) && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    expect((await updated).status()).toBe(200);
    const persisted = await page.request.get(`/api/alumnos/${result.id}`, { headers });
    expect((await persisted.json()).data.telefono).toBe('987654321');
  } finally {
    expect((await page.request.delete(`/api/users/${result.usuario_id}`, { headers })).status()).toBe(200);
  }
});

test('alumnos: profesor consulta asignados sin acciones administrativas', async ({ page }, info) => {
  await login(page, 2);
  await expect(page.getByRole('heading', { name: 'Mis alumnos', exact: true })).toBeVisible();
  await expect(student(page, info, 'Usuario 11')).toBeVisible();
  await expect(student(page, info, 'Usuario 12')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nuevo Alumno', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Editar|Rematricular/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver detalle de Usuario 11', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gestionar matrícula', exact: true })).toHaveCount(0);
  await expect(page.getByText('Matrícula pendiente de pago', { exact: true })).toHaveCount(0);
});


test('alumnos: rematrícula muestra los errores de datos y cursos y permite reintentar', async ({ page }, info) => {
  // Solo simula la disponibilidad del botón: nunca se envía una rematrícula ficticia.
  await page.route('**/api/alumnos?**', async route => {
    const response = await route.fetch(); const body = await response.json();
    body.data = body.data.map((row: any) => ({ ...row, tiene_matricula_activa_periodo: 0 }));
    await route.fulfill({ response, json: body });
  });
  const history = '**/api/alumnos/1/matriculas';
  await page.route(history, route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Fallo sintético de historial' }) }));
  await login(page);
  await student(page, info, 'Usuario 11').getByRole('button', { name: info.project.name === 'mobile' ? 'Rematricular a Usuario 11' : 'Rematricular a Actual', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Fallo sintético de historial');
  await expect(page.getByRole('button', { name: 'Confirmar rematrícula', exact: true })).toBeDisabled();
  await page.unroute(history);
  const courses = '**/api/configuracion-academica/periodos/1/grados/*/cursos';
  await page.route(courses, route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Fallo sintético de cursos' }) }));
  await page.getByRole('button', { name: 'Reintentar datos', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Fallo sintético de cursos');
  await expect(page.getByRole('button', { name: 'Confirmar rematrícula', exact: true })).toBeDisabled();
  await page.unroute(courses);
  await page.getByRole('button', { name: 'Reintentar cursos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirmar rematrícula', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rematricular alumno', exact: true })).toHaveCount(0);
});
