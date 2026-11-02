import { test, expect, type Page } from '@playwright/test';
async function setup(page:Page){
 await page.addInitScript(()=>{window.print=()=>{};});await page.goto('/login');await page.locator('input[type=email]').fill('user1@test.local');await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).toHaveURL(/dashboard$/);
 const headers={Authorization:`Bearer ${await page.evaluate(()=>localStorage.getItem('token'))}`};
 const current=(await (await page.request.get('/api/alumnos/libreta/reglas/2/2',{headers})).json()).data;
 if(current.cerrado)expect((await page.request.put('/api/alumnos/libreta/reglas/2/2',{headers,data:{configuracion:current.configuracion,revision:current.revision,cerrado:false}})).status()).toBe(200);
 return headers;
}
test('libretas: reglas, cierre, emisión, corrección y versión inmutable',async({page},info)=>{
 test.setTimeout(60000);
 const headers=await setup(page);
 await page.goto('/documentos');await page.getByRole('button',{name:'Expediente estudiantil',exact:true}).click();await page.getByRole('button',{name:/Usuario 11 A1/}).click();await page.getByRole('combobox',{name:'Periodo de la libreta',exact:true}).selectOption('2');await page.getByRole('button',{name:'Configurar reglas',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Reglas de la libreta',exact:true});
 await dialog.getByRole('spinbutton',{name:'Prácticas (%)',exact:true}).fill('100');await dialog.getByRole('spinbutton',{name:'Trabajos y proyectos (%)',exact:true}).fill('0');await dialog.getByRole('spinbutton',{name:'Exámenes (%)',exact:true}).fill('0');await dialog.getByRole('checkbox',{name:/He revisado las reglas/}).check();await dialog.getByRole('button',{name:'Guardar reglas',exact:true}).click();await expect(dialog).toHaveCount(0);
 const results=page.getByRole('region',{name:'Resultados automáticos'});await expect(results).toContainText('Aprobado');await expect(results).toContainText('15.0');await page.getByRole('button',{name:'Emitir versión definitiva',exact:true}).click();
 const confirm=page.getByRole('dialog',{name:'Emitir libreta definitiva',exact:true});await confirm.getByRole('checkbox').check();const saved=page.waitForResponse(r=>r.url().endsWith('/api/alumnos/1/libretas/2/2')&&r.request().method()==='POST');await confirm.getByRole('button',{name:'Confirmar emisión',exact:true}).click();const response=await saved;expect(response.status()).toBe(201);const id=(await response.json()).data.id;await expect(confirm).toHaveCount(0);await expect(page.getByRole('combobox',{name:'Versión para consultar e imprimir',exact:true})).toHaveValue(String(id));
 const url='/api/alumnos/1/libretas/2/2';const original=(await (await page.request.get(`/api/alumnos/1/libretas/emisiones/${id}`,{headers})).json()).data;const before=(await (await page.request.get(url,{headers})).json()).data;
 try{
  expect((await page.request.post('/api/calificaciones/oferta/4/evaluacion/3/bulk',{headers,data:{calificaciones:[{alumno_id:1,nota:0}]}})).status()).toBe(200);
  expect((await page.request.post(url,{headers,data:{revision:before.revision,huella:before.huella,solicitud_id:`stale-${info.project.name}-0000000000000000`,revisada:true}})).status()).toBe(409);
  const fresh=(await (await page.request.get(url,{headers})).json()).data;expect(fresh.calculo.cursos[0].final).toBe(0);expect(fresh.calculo.listo).toBe(true);
  const body={revision:fresh.revision,huella:fresh.huella,solicitud_id:`retry-${info.project.name}-0000000000000000`,revisada:true};const retries=await Promise.all([page.request.post(url,{headers,data:body}),page.request.post(url,{headers,data:body})]);expect(retries.map(r=>r.status()).sort()).toEqual([200,201]);const ids=await Promise.all(retries.map(async r=>(await r.json()).data.id));expect(ids[0]).toBe(ids[1]);
  const old=(await (await page.request.get(`/api/alumnos/1/libretas/emisiones/${id}`,{headers})).json()).data;expect(old.contenido).toEqual(original.contenido);expect(old.contenido.calculo.cursos[0].final).toBe(15);
  const latest=(await (await page.request.get(`/api/alumnos/1/libretas/emisiones/${ids[0]}`,{headers})).json()).data;expect(latest.version).toBe(original.version+1);expect(latest.contenido.calculo.cursos[0].final).toBe(0);
  await page.emulateMedia({media:'print'});const print=page.locator('body > .student-report-print');await expect(print).toContainText(`Libreta definitiva · Versión ${original.version}`);await expect(print.locator('.record-score strong')).toHaveText('15');await page.screenshot({path:info.outputPath('libreta-definitiva.png'),fullPage:true});await page.emulateMedia({media:'screen'});
 }finally{expect((await page.request.post('/api/calificaciones/oferta/4/evaluacion/3/bulk',{headers,data:{calificaciones:[{alumno_id:1,nota:15}]}})).status()).toBe(200);}
 await page.getByRole('button',{name:'Configurar reglas',exact:true}).click();await expect(dialog.getByRole('spinbutton',{name:'Prácticas (%)',exact:true})).toBeDisabled();await dialog.getByRole('button',{name:'Reabrir revisión',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Emitir versión definitiva',exact:true})).toBeDisabled();
});
test('libretas: validación, conflictos de revisión, pendientes y permisos',async({page})=>{
 const headers=await setup(page);const url='/api/alumnos/libreta/reglas/1/1';let data=(await (await page.request.get(url,{headers})).json()).data;const p=data.configuracion;
 expect((await page.request.put(url,{headers,data:{configuracion:{...p,pesos:{practica:50,trabajo:30,examen:40}},revision:data.revision,cerrado:false}})).status()).toBe(400);
 expect((await page.request.put(url,{headers,data:{configuracion:{...p,categorias:{'3':'practica'}},revision:data.revision,cerrado:false}})).status()).toBe(400);
 expect((await page.request.put(url,{headers,data:{configuracion:p,revision:data.revision,cerrado:false}})).status()).toBe(200);
 expect((await page.request.put(url,{headers,data:{configuracion:p,revision:data.revision,cerrado:false}})).status()).toBe(409);
 data=(await (await page.request.get(url,{headers})).json()).data;const calc=(await (await page.request.get('/api/alumnos/1/libretas/1/1',{headers})).json()).data;expect(calc.calculo.listo).toBe(false);
 expect((await page.request.post('/api/alumnos/1/libretas/1/1',{headers,data:{revision:data.revision,huella:calc.huella,solicitud_id:'blocked-000000000000000000000000',revisada:true}})).status()).toBe(409);
 for(const id of [2,11,21]){const signed=await page.request.post('/api/auth/login',{data:{email:`user${id}@test.local`,password:'originalTest'}});const token=(await signed.json()).data.token;expect((await page.request.get(url,{headers:{Authorization:`Bearer ${token}`}})).status()).toBe(403);}
});
