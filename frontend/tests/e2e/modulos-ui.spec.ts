import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, id = 1) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`user${id}@test.local`);
  await page.locator('input[type=password]').fill('originalTest');
  const response = page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page).not.toHaveURL(/login$/);
}

test('módulos: catálogo adaptable, búsqueda sin tildes y tema neutro', async ({ page }, info) => {
  await login(page);
  if (info.project.name === 'mobile') {
    await page.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('button', { name: 'Módulos', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Navegación inferior' }).getByRole('button', { name: 'Módulos', exact: true })).toHaveAttribute('aria-current', 'page');
  } else {
    await expect(page.getByRole('complementary', { name: 'Navegación principal' }).getByRole('link', { name: 'Módulos', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver todos', exact: true }).click();
  }
  await expect(page).toHaveURL(/modulos$/);
  const catalog = page.locator('.modules-catalog');
  await expect(catalog.getByRole('heading', { name: 'Módulos', exact: true })).toBeVisible();
  await expect(catalog.getByRole('heading', { name: 'Institución', exact: true })).toBeVisible();
  await expect(catalog.getByRole('heading', { name: 'Académico', exact: true })).toBeVisible();
  if (info.project.name === 'mobile') await expect(catalog.locator('a[href="/dashboard"]')).toHaveCount(0);
  await expect(catalog.locator('a[href="/documentos"]')).toBeVisible();
  await expect(catalog.getByRole('link', { name: 'Control del sistema', exact: true })).toHaveCount(0);
  expect(await catalog.getByRole('link').evaluateAll(links => new Set(links.map(link => link.getAttribute('href'))).size)).toBe(await catalog.getByRole('link').count());
  const search = page.getByRole('searchbox', { name: 'Buscar módulo', exact: true });
  await search.fill('ESTRUCTURA ACADEMICA');
  await expect(catalog.getByRole('link')).toHaveCount(1);
  await expect(catalog.getByRole('link', { name: 'Estructura Académica', exact: true })).toHaveAttribute('href', '/admin/configuracion-academica');
  await search.fill('ZZsinCoincidencia');
  await expect(catalog.getByText('No se encontraron módulos.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar todos', exact: true }).click();
  await expect(search).toHaveValue('');
  await page.screenshot({ path: info.outputPath('modulos-claro.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cambiar a tema oscuro', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({ path: info.outputPath('modulos-oscuro.png'), fullPage: true });
  const original = page.viewportSize()!;
  if (info.project.name === 'mobile') {
    for (const width of [320, 768]) {
      await page.setViewportSize({ width, height: original.height });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const link = catalog.getByRole('link', { name: 'Alumnos', exact: true });
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.locator('main').evaluate(el => { el.scrollTop = el.scrollHeight; });
      const last = await catalog.locator('section').last().boundingBox();
      const bottom = await page.getByRole('navigation', { name: 'Navegación inferior' }).boundingBox();
      expect(last!.y + last!.height).toBeLessThanOrEqual(bottom!.y);
    }
    await page.setViewportSize(original);
  }
  await catalog.getByRole('link', { name: 'Alumnos', exact: true }).click();
  await expect(page).toHaveURL(/alumnos$/);
  await expect(page.getByRole('heading', { name: 'Alumnos', exact: true })).toBeVisible();
  await page.goto('/documentos');
  await expect(page.getByRole('heading', { name: 'Documentos y expedientes', exact: true })).toBeVisible();
});

for (const account of [
  { id: 2, name: 'profesor', required: ['/alumnos', '/cursos', '/profesor/apoderados'], forbidden: ['/documentos', '/admin/pagos', '/admin/usuarios', '/reportes', '/profesores', '/superadministracion'] },
  { id: 11, name: 'alumno', required: ['/estudiante/cursos', '/estudiante/pagos', '/estudiante/calificaciones'], forbidden: ['/documentos', '/alumnos', '/admin/pagos', '/reportes', '/superadministracion'] },
  { id: 21, name: 'apoderado', required: ['/familia/alumnos', '/familia/perfil'], forbidden: ['/documentos', '/admin/pagos', '/estudiante/pagos', '/reportes', '/superadministracion'] },
  { id: 31, name: 'superadministrador', required: ['/superadministracion', '/admin/usuarios', '/admin/pagos', '/documentos'], forbidden: ['/estudiante/pagos'] }
]) {
  test(`módulos: inventario y navegación de ${account.name}`, async ({ page }) => {
    await login(page, account.id);
    await page.goto('/modulos');
    await expect(page).toHaveURL(/modulos$/);
    const catalog = page.locator('.modules-catalog');
    await expect(catalog).toBeVisible();
    for (const path of account.required) await expect(catalog.locator(`a[href="${path}"]`)).toBeVisible();
    for (const path of account.forbidden) await expect(catalog.locator(`a[href="${path}"]`)).toHaveCount(0);
    if (account.id === 21) await expect(catalog.getByRole('link')).toHaveCount(2);
    await page.reload();
    await expect(page).toHaveURL(/modulos$/);
    await catalog.locator(`a[href="${account.required[0]}"]`).click();
    await expect(page).toHaveURL(new RegExp(account.required[0] + '$'));
    if (account.id === 31) {
      await page.goto('/documentos');
      await expect(page.getByRole('heading', { name: 'Documentos y expedientes', exact: true })).toBeVisible();
    } else {
      await page.goto('/documentos');
      await expect(page).not.toHaveURL(/\/documentos$/);
    }
    if (account.id !== 31) {
      await page.goto('/admin/usuarios');
      await expect(page).not.toHaveURL(/admin\/usuarios$/);
    }
  });
}

test('módulos: navegación inferior en teléfono y lateral solo en escritorio', async ({ page }, info) => {
  await login(page);
  const sidebar=page.getByRole('complementary',{name:'Navegación principal'});
  const bottom=page.getByRole('navigation',{name:'Navegación inferior'});
  for(const width of [320,768,915,1023,1024,1280,393]) {
    await page.setViewportSize({width,height:851});
    await expect(page.getByRole('button',{name:'Abrir menú de navegación',exact:true})).toHaveCount(0);
    await expect(page.getByRole('dialog',{name:'Navegación principal'})).toHaveCount(0);
    if(width<1024){await expect(sidebar).not.toBeVisible();await expect(bottom).toBeVisible();}
    else {await expect(sidebar).toBeVisible();await expect(bottom).not.toBeVisible();await expect(sidebar.getByRole('link',{name:'Módulos',exact:true})).toHaveCount(0);}
  }
  const modules=bottom.getByRole('button',{name:'Módulos',exact:true});
  await modules.focus();await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/modulos$/);
  await expect(sidebar).not.toBeVisible();
  await page.getByRole('main').getByRole('link',{name:'Cursos',exact:true}).click();
  await expect(page).toHaveURL(/cursos$/);await expect(sidebar).not.toBeVisible();
  await page.screenshot({path:info.outputPath('navegacion-solo-inferior.png'),fullPage:true,animations:'disabled'});
});
