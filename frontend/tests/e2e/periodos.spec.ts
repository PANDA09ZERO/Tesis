import {test,expect} from '@playwright/test';

test('periodos: permite guardar históricos inactivos y bloquea activación fuera de fechas',async({page})=>{
 await page.goto('/login');await page.locator('input[type=email]').fill('user1@test.local');await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard$/);
 const token=await page.evaluate(()=>localStorage.getItem('token'));const headers={Authorization:'Bearer '+token};let id:number|undefined;
 try{
  await page.goto('/periodos');
  await page.getByRole('button',{name:'Nuevo Periodo',exact:true}).click();
  await page.getByLabel('Nombre *',{exact:true}).fill('Histórico navegador');await page.getByLabel('Inicio *',{exact:true}).fill('2000-01-01');await page.getByLabel('Fin *',{exact:true}).fill('2000-12-31');
  await expect(page.getByRole('checkbox',{name:'Periodo activo (desactiva otros)'})).toBeDisabled();
  await expect(page.getByText(/Puedes guardar el periodo inactivo/)).toBeVisible();
  const saved=page.waitForResponse(r=>r.url().endsWith('/api/periodos')&&r.request().method()==='POST');await page.getByRole('button',{name:'Crear',exact:true}).click();const response=await saved;expect(response.status()).toBe(201);id=(await response.json()).data.id;
  const card=page.locator('.card').filter({has:page.getByRole('heading',{name:'Histórico navegador',exact:true})});await expect(card.getByText('Inactivo',{exact:true})).toBeVisible();await expect(card).toContainText('01/01/2000 - 31/12/2000');
  const activated=await page.request.put('/api/periodos/'+id,{headers,data:{activo:1}});expect(activated.status()).toBe(400);expect((await activated.json()).message).toContain('Solo se puede activar un periodo');
  const periods=await (await page.request.get('/api/periodos',{headers})).json();expect(periods.data.find((p:any)=>p.id===id).activo).toBe(0);expect(periods.data.filter((p:any)=>p.activo).map((p:any)=>p.id)).toEqual([1]);
 }finally{if(id)expect((await page.request.delete('/api/periodos/'+id,{headers})).status()).toBe(200);}
});
