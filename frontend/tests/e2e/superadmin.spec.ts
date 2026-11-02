import {test,expect} from '@playwright/test';
test('superadministrador: acceso separado, contraseña y suspensión reversible',async({page},info)=>{
 await page.goto('/login');await page.locator('input[type=email]').fill('user31@test.local');await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();
 await expect(page).toHaveURL(/dashboard$/);const token=await page.evaluate(()=>localStorage.getItem('token'));
 const maintenance=async(suspended:boolean)=>page.request.put('/api/superadministracion/suspension',{headers:{Authorization:'Bearer '+token},data:{suspended,password:'originalTest'}});
 try{
  await page.goto('/superadministracion');await expect(page.getByRole('main').getByRole('heading',{name:'Control del sistema',exact:true})).toBeVisible();
  await expect(page.getByText('Sin respaldos completos registrados.')).toBeVisible();await expect(page.getByRole('button',{name:'Crear respaldo',exact:true})).toBeDisabled();
  await page.getByLabel('Contraseña actual',{exact:true}).fill('incorrecta');await page.getByRole('button',{name:'Suspender sistema',exact:true}).click();await expect(page.getByRole('alert')).toContainText('contraseña actual es incorrecta');
  await page.getByLabel('Contraseña actual',{exact:true}).fill('originalTest');await page.getByRole('button',{name:'Suspender sistema',exact:true}).click();await expect(page.getByRole('button',{name:'Reactivar sistema',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:'Reactivar sistema',exact:true})).toBeVisible();
  const login=await page.request.post('/api/auth/login',{data:{email:'user1@test.local',password:'originalTest'}});expect(login.status()).toBe(503);
  await page.screenshot({path:info.outputPath('superadministracion.png'),fullPage:true});
  await page.getByLabel('Contraseña actual',{exact:true}).fill('originalTest');await page.getByRole('button',{name:'Reactivar sistema',exact:true}).click();await expect(page.getByRole('button',{name:'Suspender sistema',exact:true})).toBeVisible();
  await page.goto('/admin/usuarios');await expect(page.getByRole('cell',{name:'user31@test.local',exact:true})).toHaveCount(0);
 }finally{const response=await maintenance(false);expect(response.ok()).toBeTruthy();}
});
