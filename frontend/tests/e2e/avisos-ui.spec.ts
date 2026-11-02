import { test, expect } from '@playwright/test';
test('avisos: el mensaje de bienvenida no bloquea los controles de cabecera',async({page})=>{
 await page.goto('/login');await page.locator('input[type=email]').fill('user21@test.local');await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).toHaveURL(/familia\/alumnos$/);
 const toast=page.locator('.app-toast').filter({hasText:'Bienvenido, Usuario'});await expect(toast).toBeVisible();await expect(toast).toHaveCSS('pointer-events','none');
 const theme=page.getByRole('button',{name:'Cambiar a tema oscuro',exact:true});await theme.hover({timeout:2000});await theme.click({timeout:2000});await expect(page.locator('html')).toHaveClass(/dark/);
 await page.getByRole('button',{name:'Ver mi perfil',exact:true}).click({timeout:2000});await expect(page).toHaveURL(/familia\/perfil$/);
});
