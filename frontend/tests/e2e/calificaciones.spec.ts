import {test, expect} from '@playwright/test';

async function login(page: any, id = 1) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`user${id}@test.local`);
  await page.locator('input[type=password]').fill('originalTest');
  await page.getByRole('button', {name:'Iniciar Sesión', exact:true}).click();
  await expect(page).toHaveURL(/dashboard$/);
}

test('calificaciones: administración usa ofertas y separa escalas, conserva cero y persiste cambios', async ({page}, info) => {
  await login(page);
  await page.goto('/calificaciones');
  await expect(page.getByRole('heading', {name:'Libros de calificaciones', exact:true})).toBeVisible();
  await expect(page.getByRole('combobox', {name:'Periodo académico'})).toBeVisible();
  await page.goto('/calificaciones/oferta/1');
  const select = page.getByRole('combobox', {name:'Evaluación', exact:true});
  await select.selectOption('1');
  const note = page.getByRole('spinbutton', {name:'Nota de Usuario 11', exact:true});
  await expect(note).toHaveValue(/^9(?:\.0+)?$/);
  await expect(page.getByRole('cell', {name:/^9\.00 \/ 10(?:\.0+)?$/})).toBeVisible();
  await select.selectOption('2');
  await expect(page.getByRole('cell', {name:/^18\.00 \/ 20(?:\.0+)?$/})).toBeVisible();
  await select.selectOption('1');
  await page.screenshot({path:info.outputPath('libro-escalas.png'), fullPage:true});
  const token = await page.evaluate(() => localStorage.getItem('token'));
  try {
    await note.fill('0');
    const saved = page.waitForResponse(r => r.url().endsWith('/calificaciones/oferta/1/evaluacion/1/bulk') && r.request().method() === 'POST');
    await page.getByRole('button', {name:'Guardar notas', exact:true}).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByRole('cell', {name:/^0\.00 \/ 10(?:\.0+)?$/})).toBeVisible();
    await page.reload();
    await page.getByRole('combobox', {name:'Evaluación', exact:true}).selectOption('1');
    await expect(note).toHaveValue(/^0(?:\.0+)?$/);
  } finally {
    expect((await page.request.post('/api/calificaciones/oferta/1/evaluacion/1/bulk', {headers:{Authorization:'Bearer '+token}, data:{calificaciones:[{alumno_id:1, nota:9}]}})).status()).toBe(200);
  }
  await page.goto('/asistencias');
  await expect(page.getByRole('heading', {name:'Asistencia por oferta', exact:true})).toBeVisible();
  await expect(page.getByRole('combobox', {name:'Periodo académico'})).toBeVisible();
});

test('calificaciones: errores visibles con reintento y creación protegida contra doble envío', async ({page}, info) => {
  await login(page);
  const book = '**/api/calificaciones/oferta/1/libro';
  await page.route(book, route => route.fulfill({status:500, contentType:'application/json', body:JSON.stringify({success:false,message:'Fallo sintético del libro'})}));
  await page.goto('/calificaciones/oferta/1');
  await expect(page.getByRole('alert')).toContainText('Fallo sintético del libro');
  await expect(page.getByText('Oferta académica no encontrada.', {exact:true})).toHaveCount(0);
  await page.unroute(book);
  await page.getByRole('button', {name:'Reintentar', exact:true}).click();
  await page.getByRole('button', {name:'Nueva evaluación', exact:true}).click();
  await page.getByRole('textbox', {name:'Nombre', exact:true}).fill(`Evaluación navegador ${info.project.name}`);
  await page.getByLabel('Fecha', {exact:true}).fill('2026-10-15');
  let release!: () => void;
  const gate = new Promise<void>(resolve => release = resolve);
  let requests = 0;
  const path = '**/api/evaluaciones/oferta/1';
  await page.route(path, async route => {
    if (route.request().method() === 'POST') { requests++; await gate; }
    await route.continue();
  });
  try {
    await page.getByRole('button', {name:'Crear evaluación', exact:true}).click();
    await expect(page.getByRole('button', {name:'Creando…', exact:true})).toBeDisabled();
    await page.locator('form').last().evaluate(form => (form as HTMLFormElement).requestSubmit());
    const created = page.waitForResponse(r => r.url().endsWith('/evaluaciones/oferta/1') && r.request().method() === 'POST');
    release();
    expect((await created).status()).toBe(201);
    await expect(page.getByRole('heading', {name:'Nueva evaluación', exact:true})).toHaveCount(0);
    expect(requests).toBe(1);
  } finally { release(); await page.unroute(path); }
  const save = '**/api/calificaciones/oferta/1/evaluacion/1/bulk';
  await page.getByRole('combobox', {name:'Evaluación', exact:true}).selectOption('1');
  await page.getByRole('spinbutton', {name:'Nota de Usuario 11', exact:true}).fill('8');
  await page.route(save, route => route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({success:false,message:'No se pudo guardar la nota sintética'})}));
  await page.getByRole('button', {name:'Guardar notas', exact:true}).click();
  await expect(page.getByText('No se pudo guardar la nota sintética', {exact:true})).toBeVisible();
  await expect(page.getByRole('spinbutton', {name:'Nota de Usuario 11', exact:true})).toHaveValue('8');
  await page.unroute(save);
});

test('asistencia: docente histórico tiene todos los campos de solo consulta', async ({page}) => {
  await login(page, 2);
  await page.goto('/asistencias/oferta/4');
  await page.getByLabel('Fecha', {exact:true}).fill('2025-10-14');
  await expect(page.getByRole('combobox', {name:'Asistencia de Usuario 11', exact:true})).toBeDisabled();
  await expect(page.getByRole('textbox', {name:'Observación de Usuario', exact:true})).toBeDisabled();
  await expect(page.getByRole('button', {name:'Todos presentes', exact:true})).toBeDisabled();
  await page.goto('/calificaciones/oferta/4');
  await expect(page.getByText('Periodo histórico: solo consulta.', {exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name:'Nueva evaluación', exact:true})).toBeDisabled();
  await expect(page.getByRole('spinbutton', {name:'Nota de Usuario 11', exact:true})).toBeDisabled();
});

test('evaluaciones: explica el límite del periodo vencido y conserva la validación de fechas', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-23T17:00:00Z'));
  await login(page);
  await page.route('**/api/configuracion-academica/ofertas/1', async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.fecha_inicio = '2026-03-01';
    body.data.fecha_fin = '2026-07-15';
    body.data.periodo = '2026-I';
    await route.fulfill({response, json:body});
  });
  await page.goto('/calificaciones/oferta/1');
  await expect(page.getByRole('alert')).toContainText('Hoy (23/10/2026)');
  await expect(page.getByRole('alert')).toContainText('01/03/2026 al 15/07/2026');
  await expect(page.getByRole('link', {name:'revisar fechas en Periodos académicos'})).toHaveAttribute('href', '/periodos');
  await page.getByRole('button', {name:'Nueva evaluación', exact:true}).click();
  await expect(page.getByText('Fecha permitida: 01/03/2026 al 15/07/2026.', {exact:true})).toBeVisible();
  const date = page.getByLabel('Fecha', {exact:true});
  await expect(date).toHaveAttribute('min', '2026-03-01');
  await expect(date).toHaveAttribute('max', '2026-07-15');
  await date.fill('2026-10-23');
  expect(await date.evaluate(input => (input as HTMLInputElement).validity.rangeOverflow)).toBe(true);
});
