import { test, expect, type Page } from '@playwright/test';
async function login(page:Page,id=1){await page.goto('/login');await page.locator('input[type=email]').fill(`user${id}@test.local`);await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).not.toHaveURL(/login$/);}
const records=(page:Page,mobile:boolean)=>page.locator(mobile?'.people-table article':'.people-table tbody');
for(const section of [{path:'/profesores',title:'Profesores',person:'profesor',sample:'Usuario 2',search:'Buscar profesor...',endpoint:'profesores'}, {path:'/admin/apoderados',title:'Apoderados',person:'apoderado',sample:'Usuario 21',search:'Buscar apoderado...',endpoint:'apoderados'}]){
 test(`personas: listado adaptable y errores de ${section.endpoint}`,async({page},info)=>{
  await login(page);await page.goto(section.path);const data=records(page,info.project.name==='mobile');
  await expect(data.getByText(section.sample,{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath(`${section.endpoint}-claro.png`),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Cambiar a tema oscuro',exact:true}).click();
  await page.screenshot({path:info.outputPath(`${section.endpoint}-oscuro.png`),fullPage:true,animations:'disabled'});
  await page.getByRole('textbox',{name:section.search,exact:true}).fill('SinCoincidenciasUI');
  await expect(page.getByText(`No se encontraron ${section.endpoint}`,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();await expect(data.getByText(section.sample,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:`Editar ${section.person} ${section.sample}`,exact:true}).click();
  await expect(page.getByLabel('Email',{exact:true})).toHaveAttribute('readonly','');
  await expect(page.getByLabel('Nombre',{exact:true})).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  const route=`**/api/${section.endpoint}?*`;
  await page.route(route,r=>r.fulfill({status:500,json:{success:false,message:'Fallo sintético del directorio'}}));
  await page.getByRole('button',{name:'Actualizar lista',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Fallo sintético del directorio');
  await expect(page.getByText(`No se encontraron ${section.endpoint}`,{exact:true})).toHaveCount(0);
  await page.unroute(route);await page.getByRole('button',{name:'Reintentar',exact:true}).click();await expect(data.getByText(section.sample,{exact:true})).toBeVisible();
  if(info.project.name==='mobile'){await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 });
}
test('personas: profesor se registra, edita y desactiva con persistencia',async({page},info)=>{
 await login(page);await page.goto('/profesores');const suffix=Date.now();const name='UIProfesor'+suffix;
 await page.getByRole('button',{name:'Nuevo Profesor',exact:true}).click();
 await page.getByLabel('Nombre',{exact:true}).fill(name);await page.getByLabel('Apellido',{exact:true}).fill('Prueba');
 await page.getByLabel('Dirección',{exact:true}).fill('Av. Profesor 456');
 await page.getByLabel('Especialidad',{exact:true}).fill('Ciencias');
 const created=page.waitForResponse(r=>r.url().endsWith('/api/profesores')&&r.request().method()==='POST');await page.getByRole('button',{name:'Registrar',exact:true}).click();const response=await created;expect(response.status()).toBe(201);const createdAccount=(await response.json()).data;const id=createdAccount.id;expect(createdAccount.credentials.email).toBe(`${name.toLowerCase()}.prueba@cienciaseingenieria.edu`);await expect(page.getByText(createdAccount.credentials.temporaryPassword,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 const authHeaders={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};const createdProfile=await page.request.get(`/api/profesores/${id}`,{headers:authHeaders});expect((await createdProfile.json()).data.direccion).toBe('Av. Profesor 456');
 await page.getByRole('textbox',{name:'Buscar profesor...',exact:true}).fill(name);const data=records(page,info.project.name==='mobile');await expect(data.getByText(name+' Prueba',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:`Editar profesor ${name} Prueba`,exact:true}).click();await page.getByLabel('Especialidad',{exact:true}).fill('Matemática');
 await page.route(`**/api/profesores/${id}`,r=>r.request().method()==='PUT'?r.fulfill({status:500,json:{success:false,message:'No se pudo guardar el perfil sintético'}}):r.continue());
 await page.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(page.getByRole('alert')).toContainText('No se pudo guardar el perfil sintético');await expect(page.getByLabel('Especialidad',{exact:true})).toHaveValue('Matemática');
 await page.unroute(`**/api/profesores/${id}`);await page.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(data.getByText('Matemática',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:`Ver profesor ${name} Prueba`,exact:true}).click();await expect(page.getByRole('heading',{name:'Asignaciones por periodo y grado',exact:true})).toBeVisible();await expect(page.getByText('Matemática',{exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('profesor-detalle.png'),fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Volver a profesores',exact:true}).click();await page.getByRole('textbox',{name:'Buscar profesor...',exact:true}).fill(name);
 await page.getByRole('button',{name:`Desactivar profesor ${name} Prueba`,exact:true}).click();await page.getByRole('button',{name:'Desactivar',exact:true}).click();await expect(page.getByText('No se encontraron profesores',{exact:true})).toBeVisible();
});
test('personas: apoderado conserva perfil completo y vincula alumnos sin duplicar',async({page},info)=>{
 await login(page);await page.goto('/admin/apoderados');const suffix=Date.now(),name='UIApoderado'+suffix;let id:number|undefined;
 const token=await page.evaluate(()=>localStorage.getItem('token'));const headers={Authorization:'Bearer '+token};
 try{
 await page.getByRole('button',{name:'Nuevo Apoderado',exact:true}).click();await page.getByLabel('Nombre',{exact:true}).fill(name);await page.getByLabel('Apellido',{exact:true}).fill('Prueba');await page.getByLabel('Fecha Nacimiento',{exact:true}).fill('1990-03-15');await page.getByLabel('Género',{exact:true}).selectOption('F');
 const created=page.waitForResponse(r=>r.url().endsWith('/api/apoderados')&&r.request().method()==='POST');await page.getByRole('button',{name:'Registrar',exact:true}).click();const response=await created;expect(response.status()).toBe(201);const createdAccount=(await response.json()).data;id=createdAccount.id;expect(createdAccount.credentials.email).toBe(`${name.toLowerCase()}.prueba@cienciaseingenieria.edu`);await expect(page.getByText(createdAccount.credentials.temporaryPassword,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.getByRole('textbox',{name:'Buscar apoderado...',exact:true}).fill(name);const data=records(page,info.project.name==='mobile');await expect(data.getByText(name+' Prueba',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:`Editar apoderado ${name} Prueba`,exact:true}).click();await expect(page.getByLabel('Fecha Nacimiento',{exact:true})).toHaveValue('1990-03-15');await expect(page.getByLabel('Género',{exact:true})).toHaveValue('F');await page.getByLabel('Ocupación',{exact:true}).fill('Docente');await page.getByRole('button',{name:'Actualizar',exact:true}).click();await expect(data.getByText('Docente',{exact:true})).toBeVisible();
 const profile=await page.request.get(`/api/apoderados/${id}`,{headers});expect((await profile.json()).data.fecha_nacimiento).toBe('1990-03-15');
 await page.getByRole('button',{name:`Vincular alumnos a ${name} Prueba`,exact:true}).click();await expect(page.getByRole('region',{name:'Alumnos vinculados',exact:true})).toContainText('Sin alumnos vinculados.');
 await page.getByRole('combobox',{name:'Alumno',exact:true}).selectOption('3');await page.getByLabel('Parentesco',{exact:true}).selectOption('Tutor');
 const assigned=page.waitForResponse(r=>r.url().endsWith(`/api/apoderados/${id}/asignar-alumno`));await page.getByRole('button',{name:'Asignar',exact:true}).click();expect((await assigned).status()).toBe(201);
 await expect(page.getByRole('region',{name:'Alumnos vinculados',exact:true})).toContainText('Usuario 13 · A3 · Tutor');await expect(page.getByRole('combobox',{name:'Alumno',exact:true}).locator('option[value="3"]')).toHaveCount(0);
 const duplicate=await page.request.post(`/api/apoderados/${id}/asignar-alumno`,{headers,data:{alumno_id:3,parentesco:'Tutor'}});expect(duplicate.status()).toBe(409);
 await page.screenshot({path:info.outputPath('apoderado-vinculos.png'),fullPage:true,animations:'disabled'});await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.getByRole('button',{name:`Eliminar apoderado ${name} Prueba`,exact:true}).click();await page.getByRole('button',{name:'Eliminar',exact:true}).click();await expect(page.getByText('No se encontraron apoderados',{exact:true})).toBeVisible();id=undefined;
 }finally{if(id){await page.request.delete(`/api/apoderados/${id}/alumnos/3`,{headers});await page.request.delete(`/api/apoderados/${id}`,{headers});}}
});
test('personas: error al consultar alumnos impide una asignación y permite reintentar',async({page})=>{
 await login(page);await page.goto('/admin/apoderados');await page.route('**/api/alumnos?*',r=>r.fulfill({status:500,json:{success:false,message:'Fallo sintético al buscar alumnos'}}));await page.getByRole('button',{name:'Vincular alumnos a Usuario 23',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Fallo sintético al buscar alumnos');await expect(page.getByRole('button',{name:'Asignar',exact:true})).toBeDisabled();await page.unroute('**/api/alumnos?*');await page.getByRole('button',{name:'Reintentar alumnos',exact:true}).click();await expect(page.getByRole('combobox',{name:'Alumno',exact:true})).toBeVisible();
});
test('personas: apoderados de mis alumnos conserva alcance docente',async({page},info)=>{
 await login(page,2);await page.goto('/profesor/apoderados');const data=records(page,info.project.name==='mobile');await expect(data.getByText('Usuario 21',{exact:true})).toBeVisible();await expect(data.getByText('Usuario 22',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Nuevo Apoderado',exact:true})).toHaveCount(0);await page.getByRole('textbox',{name:'Buscar apoderado o alumno...',exact:true}).fill('SinCoincidenciasUI');await expect(page.getByText('No hay coincidencias para esta búsqueda.',{exact:true})).toBeVisible();
});
