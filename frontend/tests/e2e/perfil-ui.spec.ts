import { test, expect, type Page } from '@playwright/test';
async function login(page: Page, id: number) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`user${id}@test.local`);
  await page.locator('input[type=password]').fill('originalTest');
  const response = page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page).not.toHaveURL(/login$/);
}
async function security(page: Page) {
  await expect(page.locator('.profile-page')).toBeVisible();
  const tab = page.getByRole('navigation', { name: 'Secciones del perfil' }).getByRole('button', { name: 'Seguridad', exact: true });
  if (await tab.isVisible()) await tab.click();
}
const profiles = [
  { id: 1, role: 'Administrador', path: '/perfil', minimum: 6 },
  { id: 2, role: 'Profesor', path: '/profesor/perfil', minimum: 6 },
  { id: 11, role: 'Estudiante', path: '/estudiante/perfil', minimum: 6 },
  { id: 21, role: 'Apoderado', path: '/familia/perfil', minimum: 6 },
  { id: 31, role: 'Superadministrador', path: '/perfil', minimum: 12 }
];
for (const account of profiles) {
  test(`perfil: datos propios y vista adaptable de ${account.role}`, async ({ page }, info) => {
    await login(page, account.id);
    await page.getByRole('button', { name: 'Ver mi perfil', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(account.path + '$'));
    const profile = page.locator('.profile-page');
    await expect(profile.getByRole('heading', { name: 'Mi perfil', exact: true })).toBeVisible();
    const summary = page.getByRole('region', { name: 'Resumen de mi cuenta' });
    await expect(summary).toContainText(`Usuario ${account.id}`);
    await expect(summary).toContainText(`user${account.id}@test.local`);
    await expect(summary.getByText(account.role, { exact: true })).toBeVisible();
    await expect(profile.getByRole('heading', { name: 'Información institucional', exact: true })).toHaveCount(account.id === 2 || account.id === 11 ? 1 : 0);
    await expect(page.getByLabel('Nueva contraseña', { exact: true })).toHaveAttribute('minlength', String(account.minimum));
    await expect(page.getByRole('combobox', { name: /Periodo académico/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('perfil-claro.png'), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Cambiar a tema oscuro', exact: true }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({ path: info.outputPath('perfil-oscuro.png'), fullPage: true, animations: 'disabled' });
    await security(page);
    await expect(page.getByRole('button', { name: 'Cambiar contraseña', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('perfil-seguridad.png'), fullPage: true, animations: 'disabled' });
    if (info.project.name === 'mobile') {
      await expect(page.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('button', { name: 'Perfil', exact: true })).toHaveAttribute('aria-current', 'page');
      const size = page.viewportSize()!;
      await page.setViewportSize({ width: 320, height: size.height });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.setViewportSize(size);
    }
    await page.reload();
    await expect(page).toHaveURL(new RegExp(account.path + '$'));
    await expect(profile).toBeVisible();
    await security(page);
    await profile.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL(/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });
}

test('perfil: cada usuario puede guardar su fecha de nacimiento y género', async ({ page }) => {
  await login(page, 2);
  await page.getByRole('button', { name: 'Ver mi perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Completa tus datos personales', exact: true })).toBeVisible();
  await page.getByLabel('Fecha de nacimiento', { exact: true }).fill('1995-06-14');
  await page.getByLabel('Género', { exact: true }).selectOption('F');
  let payload: unknown;
  await page.route('**/api/auth/profile/personal', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Datos personales actualizados', data: null }) });
  });
  await page.getByRole('button', { name: 'Guardar datos', exact: true }).click();
  await expect(page.locator('.profile-page').getByText('Tus datos personales se actualizaron.', { exact: true })).toBeVisible();
  expect(payload).toEqual({ fecha_nacimiento: '1995-06-14', genero: 'F' });
});

test('perfil: validación, visibilidad, error de servidor y envío único', async ({ page }) => {
  await login(page, 1);
  await page.getByRole('button', { name: 'Ver mi perfil', exact: true }).click();
  await security(page);
  const current = page.getByLabel('Contraseña actual', { exact: true });
  const next = page.getByLabel('Nueva contraseña', { exact: true });
  const confirm = page.getByLabel('Confirmar nueva contraseña', { exact: true });
  const save = page.locator('.profile-page form button[type=submit]');
  await current.fill('incorrecta'); await next.fill('SyntheticPass123'); await confirm.fill('SyntheticPass124');
  await save.click(); await expect(page.getByRole('alert')).toContainText('no coinciden');
  await confirm.fill('SyntheticPass123');
  const denied = page.waitForResponse(r => r.url().endsWith('/api/auth/change-password'));
  await save.click(); expect((await denied).status()).toBe(400);
  await expect(page.getByRole('alert')).toContainText('contraseña actual es incorrecta');
  await page.getByRole('button', { name: 'Mostrar nueva contraseña', exact: true }).click();
  await expect(next).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar nueva contraseña', exact: true }).click();
  await expect(next).toHaveAttribute('type', 'password');
  await current.fill('originalTest');
  let release!: () => void; const gate = new Promise<void>(resolve => release = resolve); let sent = 0;
  await page.route('**/api/auth/change-password', async route => {
    sent++; await gate;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Fallo sintético de seguridad' }) });
  });
  try {
    await save.click(); await expect(save).toBeDisabled();
    await page.locator('.profile-page form').evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect.poll(() => sent).toBe(1); release();
    await expect(page.getByRole('alert')).toContainText('Fallo sintético de seguridad');
    await expect(next).toHaveValue('SyntheticPass123');
    await expect(save).toBeEnabled(); await expect(page).toHaveURL(/perfil$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).not.toBeNull();
  } finally { release(); }
});

test('perfil: errores de carga y respuesta inválida permiten reintentar sin datos ficticios', async ({ page }) => {
  await login(page, 2);
  const path = '**/api/profesores/me/perfil';
  await page.route(path, route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Fallo sintético de perfil' }) }));
  await page.getByRole('button', { name: 'Ver mi perfil', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Fallo sintético de perfil');
  await expect(page.getByRole('heading', { name: 'Datos personales', exact: true })).toHaveCount(0);
  await page.unroute(path);
  await page.route(path, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) }));
  await page.getByRole('button', { name: 'Reintentar perfil', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('perfil válido');
  await page.unroute(path);
  await page.getByRole('button', { name: 'Reintentar perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Datos personales', exact: true })).toBeVisible();
});

test('perfil: cambiar contraseña persiste y revoca sesiones anteriores', async ({ page }) => {
  await login(page, 23);
  await page.getByRole('button', { name: 'Ver mi perfil', exact: true }).click();
  const oldToken = await page.evaluate(() => localStorage.getItem('token'));
  await security(page);
  const nextPassword = 'SyntheticNewPass123'; let changed = false;
  try {
    await page.getByLabel('Contraseña actual', { exact: true }).fill('originalTest');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(nextPassword);
    await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill(nextPassword);
    const response = page.waitForResponse(r => r.url().endsWith('/api/auth/change-password'));
    await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
    expect((await response).status()).toBe(200); changed = true;
    await expect(page).toHaveURL(/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
    expect((await page.request.get('/api/auth/profile', { headers: { Authorization: 'Bearer ' + oldToken } })).status()).toBe(401);
    const oldLogin = await page.request.post('/api/auth/login', { data: { email: 'user23@test.local', password: 'originalTest' } });
    expect(oldLogin.status()).toBe(401);
  } finally {
    if (changed) {
      const login = await page.request.post('/api/auth/login', { data: { email: 'user23@test.local', password: nextPassword } });
      expect(login.status()).toBe(200); const token = (await login.json()).data.token;
      expect((await page.request.put('/api/auth/change-password', { headers: { Authorization: 'Bearer ' + token }, data: { currentPassword: nextPassword, newPassword: 'originalTest' } })).status()).toBe(200);
    }
  }
});
