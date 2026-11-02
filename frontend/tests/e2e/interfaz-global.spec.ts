import { test, expect, type Page } from '@playwright/test';
async function login(page:Page){await page.goto('/login');await page.locator('input[type=email]').fill('user1@test.local');await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).not.toHaveURL(/login$/);}
const routes=[['cursos','/cursos'],['periodos','/periodos'],['estructura','/admin/configuracion-academica'],['matriculas','/admin/matriculas'],['pagos','/admin/pagos'],['usuarios','/admin/usuarios'],['notificaciones','/admin/notificaciones'],['documentos','/documentos'],['alertas','/alertas'],['reportes','/reportes'],['calendario','/calendario'],['notas','/calificaciones/oferta/1'],['asistencia','/asistencias/oferta/1']];
for(const [name,url] of routes){
 test(`interfaz global: ${name} en claro, oscuro y pantalla estrecha`,async({page},info)=>{
  await login(page);await page.goto(url);const main=page.getByRole('main');await expect(main.locator('.app-page')).toBeVisible();await expect(main.getByRole('heading').first()).toBeVisible();
  await expect(main.locator('.animate-pulse').first()).toHaveCount(0,{timeout:15000});
  await expect(main.getByRole('alert')).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`${name}-claro.png`),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Cambiar a tema oscuro',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);
  await page.screenshot({path:info.outputPath(`${name}-oscuro.png`),fullPage:true,animations:'disabled'});
  if(info.project.name==='mobile' && ['notas','asistencia'].includes(name)){await main.locator('.record-table tbody tr').first().scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`${name}-registro-oscuro.png`),fullPage:true,animations:'disabled'});}
  const contrast=await main.locator('.text-gray-900').evaluateAll(nodes=>nodes.filter(n=>(n as HTMLElement).offsetParent!==null).map(n=>({text:n.textContent?.slice(0,60),color:getComputedStyle(n).color})).filter(n=>{const values=n.color.match(/[\d.]+/g)?.map(Number)||[];return values.length>=3&&values.slice(0,3).every(v=>v<100);}));
  expect(contrast).toEqual([]);
  const neutral=await main.locator('.btn-primary').evaluateAll(nodes=>nodes[0]?getComputedStyle(nodes[0]).backgroundColor:null);
  if(neutral){const rgb=neutral.match(/[\d.]+/g)!.map(Number);expect(Math.abs(rgb[0]-rgb[2])).toBeLessThanOrEqual(2);}
  if(info.project.name==='mobile'){
   await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   // A clipped toolbar is still a layout defect, even if main hides horizontal overflow.
   const wide=await main.evaluate(n=>n.scrollWidth>n.clientWidth+1);expect(wide).toBe(false);
   if(['notas','asistencia'].includes(name))expect(await page.evaluate(()=>Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)<=innerHeight+1)).toBe(true);
  }
 });
}
test('interfaz global: pago docente conserva tres campos y ventana oscura adaptable',async({page},info)=>{
 await login(page);await page.goto('/admin/pagos');await page.getByRole('button',{name:'Cambiar a tema oscuro',exact:true}).click();await page.getByRole('button',{name:'Pagos de profesores',exact:true}).click();await page.getByRole('button',{name:'Registrar pago',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Registrar pago de profesor',exact:true});await expect(dialog).toBeVisible();await expect(dialog.locator('input,select')).toHaveCount(3);await page.screenshot({path:info.outputPath('pago-profesor-modal-oscuro.png'),fullPage:true,animations:'disabled'});const bg=await dialog.evaluate(n=>getComputedStyle(n).backgroundColor);expect(bg).toBe('rgb(27, 27, 27)');if(info.project.name==='mobile'){await page.setViewportSize({width:320,height:740});expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);}await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
});
test('interfaz global: login permite elegir tema y conserva la preferencia',async({page})=>{
 await page.goto('/login');await page.getByRole('button',{name:'Cambiar a tema oscuro',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark/);await page.reload();await expect(page.locator('html')).toHaveClass(/dark/);await expect(page.getByRole('button',{name:'Cambiar a tema claro',exact:true})).toBeVisible();await page.getByRole('button',{name:'Mostrar contraseña',exact:true}).click();await expect(page.getByLabel('Contraseña',{exact:true})).toHaveAttribute('type','text');
});
