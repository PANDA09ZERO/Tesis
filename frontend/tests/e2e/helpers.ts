import { expect, type Locator, type Page } from '@playwright/test';

/*
 * DataTable y las tablas de registros muestran cada fila como tarjeta desplegable
 * (<details class="mobile-bento-card">). Los datos secundarios y los controles quedan
 * dentro y solo son visibles al abrirla.
 */
const cards = (page: Page) => page.getByRole('main').locator('details.mobile-bento-card');

/** Abre todas las tarjetas visibles que estén cerradas. No falla si la vista no tiene tarjetas. */
export async function openCards(page: Page) {
  await cards(page).first().waitFor({ timeout: 5000 }).catch(() => {});
  for (const summary of await cards(page).locator(':scope:not([open]) > summary').all()) {
    if (await summary.isVisible()) await summary.click();
  }
}

/** Valor de una celda: en escritorio la celda de la tabla; en tarjetas, el texto dentro de la tarjeta. */
export function recordValue(page: Page, mobile: boolean, name: RegExp | string): Locator {
  if (!mobile) return page.getByRole('cell', { name });
  // En la tarjeta, el valor va precedido de su etiqueta (.record-label), así que no se ancla al inicio.
  const text = name instanceof RegExp ? new RegExp(name.source.replace(/^\^/, ''), name.flags) : name;
  return page.getByRole('main').locator('details[open]').getByText(text).first();
}

/** Espera un valor de registro; en tarjetas reabre si la vista se redibujó (al cambiar de evaluación o guardar). */
export async function expectRecord(page: Page, mobile: boolean, name: RegExp | string) {
  if (!mobile) { await expect(page.getByRole('cell', { name })).toBeVisible(); return; }
  await expect(async () => {
    await openCards(page);
    await expect(recordValue(page, mobile, name)).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
}
