import {test,expect} from '@playwright/test';
async function login(page:any,id=21){await page.goto('/login');await page.locator('input[type=email]').fill(`user${id}@test.local`);await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).toHaveURL(/\/familia\/alumnos$/);}
test('familia: tarjetas, pestañas y un periodo común para notas y asistencia',async({page},info)=>{
 const records=page.getByRole('main').locator(info.project.name==='mobile'?'article':'tbody');
 await login(page);await expect(page.getByRole('main').getByRole('heading',{name:'Estudiantes a mi cargo',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Usuario 11',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Usuario 12',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Usuario 13',exact:true})).toHaveCount(0);
 await page.getByRole('navigation',{name:'Consultar a Usuario 11',exact:true}).getByRole('link',{name:'Resumen',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Usuario 11',exact:true})).toBeVisible();await expect(page.getByText('Parentesco: Padre',{exact:false})).toBeVisible();
 await expect(page.getByText(/Documentos/)).toHaveCount(0);
 const sections=page.getByRole('navigation',{name:'Secciones del estudiante'});
 await sections.getByRole('button',{name:'Calificaciones',exact:true}).click();await page.getByRole('combobox',{name:'Periodo académico'}).selectOption('2');
 await expect(records.getByText('14/10/2025',{exact:true})).toBeVisible();await expect(records.getByText('14/10/2026',{exact:true})).toHaveCount(0);
 await sections.getByRole('button',{name:'Asistencia',exact:true}).click();await expect(records.getByText('14/10/2025',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('combobox',{name:'Periodo académico'})).toHaveValue('2');await expect(page.getByRole('heading',{name:'Asistencia del periodo'})).toBeVisible();
 await page.screenshot({path:info.outputPath('familia-asistencia.png'),fullPage:true});
 await page.goto('/alumnos/1?vista=documentos');await expect(page.getByRole('heading',{name:/Resumen de/})).toBeVisible();await expect(page.getByRole('button',{name:'Documentos',exact:true})).toHaveCount(0);
 await page.goto('/alumnos/3');await expect(page.getByRole('alert')).toContainText('Estudiante no encontrado');
});
test('familia: sin vínculos explica cómo solicitar la asignación',async({page})=>{
 await login(page,23);await expect(page.getByRole('heading',{name:'No hay estudiantes vinculados'})).toBeVisible();await expect(page.getByText(/Solicita a administración que vincule/)).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('familia: un error de servidor se muestra y permite reintentar',async({page})=>{
 await page.route('**/api/apoderados/me/inicio',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({success:false,message:'Fallo de consulta sintético'})}));
 await login(page);await expect(page.getByRole('alert')).toContainText('Fallo de consulta sintético');await expect(page.getByRole('heading',{name:'No hay estudiantes vinculados'})).toHaveCount(0);
 await page.unroute('**/api/apoderados/me/inicio');await page.getByRole('button',{name:'Reintentar',exact:true}).click();await expect(page.getByRole('heading',{name:'Usuario 11',exact:true})).toBeVisible();
});
test('familia: carga visible sin presentar ceros ni datos anteriores',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/apoderados/me/inicio',async route=>{await gate;await route.continue();});
 try{await login(page);await expect(page.getByRole('status').filter({hasText:'Cargando estudiantes y sus resúmenes'})).toBeVisible();await expect(page.getByRole('heading',{name:'No hay estudiantes vinculados'})).toHaveCount(0);}
 finally{release();}
 await expect(page.getByRole('heading',{name:'Usuario 11',exact:true})).toBeVisible();
});
