import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill('user1@test.local');
  await page.locator('input[type=password]').fill('originalTest');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page).not.toHaveURL(/login$/);
}

// La base de pruebas no tiene alertas (las generan las reglas), así que se simula la API con una
// alerta en cada estado y se comprueban las acciones y la petición que envía cada botón.
const alerta = (estado: string) => ({
  id: 7, alumno_id: 1, alumno_nombre: 'Usuario', alumno_apellido: '11', codigo_alumno: 'A1', grado: 'Primero',
  tipo_riesgo: 'medio', estado, descripcion: 'Tres faltas en la última semana.', recomendacion: 'Conversar con el apoderado.',
  created_at: '2026-11-20T10:00:00Z',
});

test('alertas: una atendida se puede resolver o reactivar, y una resuelta se puede reabrir', async ({ page }) => {
  let estado = 'atendida';
  const cambios: string[] = [];
  await page.route('**/api/alertas?**', route => route.fulfill({ json: { success: true, data: [alerta(estado)], total: 1, page: 1, totalPages: 1 } }));
  await page.route('**/api/alertas/7/estado', async route => {
    estado = route.request().postDataJSON().estado; cambios.push(estado);
    await route.fulfill({ json: { success: true, data: null, message: 'Alerta actualizada' } });
  });
  await login(page);
  await page.goto('/alertas');

  await expect(page.getByRole('button', { name: 'Atender', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Marcar como resuelta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reabrir', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Marcar como resuelta', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Reabrir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atender', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Atender', exact: true }).click();
  await page.getByRole('button', { name: 'Volver a activa', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Atender', exact: true })).toBeVisible();
  expect(cambios).toEqual(['resuelta', 'activa', 'atendida', 'activa']);

  // Una alerta superada por la revisión automática no ofrece acciones.
  estado = 'expirada';
  await page.reload();
  await expect(page.getByText('Tres faltas en la última semana.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Atender|Resolver|Marcar como resuelta|Reabrir|Volver a activa/ })).toHaveCount(0);
});
