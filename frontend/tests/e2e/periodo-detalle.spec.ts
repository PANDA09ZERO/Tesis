import {test,expect} from '@playwright/test';
async function login(page:any,id=1){await page.goto('/login');await page.locator('input[type=email]').fill(`user${id}@test.local`);await page.locator('input[type=password]').fill('originalTest');const signed=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();expect((await signed).status()).toBe(200);await expect(page).toHaveURL(/dashboard$/);}

test('detalle de periodo: historial, estructura y libros con pagos separados y filtro persistente',async({page},info)=>{
 const records=page.getByRole('main').locator(info.project.name==='mobile'?'article':'tbody');
 const value=(name:string)=>records.getByText(name,{exact:true});
 await login(page);const token=await page.evaluate(()=>localStorage.getItem('token'));const headers={Authorization:'Bearer '+token};const created:Array<{path:string;id:number}>=[];
 try{
  for(const [path,data] of [
   ['/api/pagos-matricula',{alumno_id:1,matricula_id:1,monto:200,estado:'pendiente'}],
   ['/api/pagos-matricula',{alumno_id:1,matricula_id:3,monto:50,estado:'pagado',fecha_pago:'2025-10-14'}],
   ['/api/mensualidades',{alumno_id:1,periodo_academico_id:1,monto:100,mes:'Octubre',año:2026,estado:'pagado',fecha_pago:'2026-10-14'}],
   ['/api/mensualidades',{alumno_id:1,periodo_academico_id:2,monto:80,mes:'Septiembre',año:2025,estado:'pendiente'}]
  ] as const){const response=await page.request.post(path,{headers,data});expect(response.status()).toBe(201);created.push({path,id:(await response.json()).data.id});}
  await page.goto('/periodos');await page.getByRole('link',{name:'Ver detalle de Anterior',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Detalle del periodo: Anterior',exact:true})).toBeVisible();await expect(page.getByText('01/01/2025 al 31/12/2025',{exact:true})).toBeVisible();await page.screenshot({path:info.outputPath('detalle-periodo.png'),fullPage:true});
  await page.getByRole('button',{name:'Estructura académica',exact:true}).click();await expect(page.getByRole('heading',{name:'Primaria · Segundo',exact:true})).toBeVisible();await expect(value('Usuario 2')).toBeVisible();await expect(page.getByRole('link',{name:'Gestionar estructura de este periodo'})).toHaveAttribute('href','/admin/configuracion-academica?periodo_id=2');
  await page.getByRole('button',{name:'Matrículas',exact:true}).click();await expect(value('11, Usuario')).toBeVisible();await expect(info.project.name==='mobile'?records:page.getByRole('row')).toHaveCount(info.project.name==='mobile'?1:2);
  await page.getByRole('button',{name:'Calificaciones y asistencia',exact:true}).click();await expect(records.getByRole('link',{name:'Calificaciones',exact:true})).toHaveAttribute('href','/calificaciones/oferta/4');await expect(records.getByRole('link',{name:'Asistencia',exact:true})).toHaveAttribute('href','/asistencias/oferta/4?vista=historial');
  await page.getByRole('button',{name:'Pagos de matrícula',exact:true}).click();await expect(value('S/ 50.00')).toBeVisible();await expect(value('S/ 200.00')).toHaveCount(0);await expect(value('pagado')).toBeVisible();
  await page.getByRole('button',{name:'Mensualidades',exact:true}).click();await expect(value('S/ 80.00')).toBeVisible();await expect(value('Septiembre 2025')).toBeVisible();await expect(value('S/ 100.00')).toHaveCount(0);await expect(value('pendiente')).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'Detalle del periodo: Anterior',exact:true})).toBeVisible();await expect(value('S/ 80.00')).toBeVisible();
  await page.getByRole('navigation',{name:'Secciones del periodo'}).getByRole('button',{name:'Horarios',exact:true}).click();await expect(page.getByText('Sin registros en este periodo',{exact:true})).toBeVisible();
 }finally{for(const item of created.reverse())expect((await page.request.delete(item.path+'/'+item.id,{headers})).status()).toBe(200);}
});

test('detalle de periodo: profesor consulta solo asignaciones propias sin finanzas ni administración',async({page})=>{
 await login(page,2);await page.goto('/periodos');await expect(page.getByRole('button',{name:'Nuevo Periodo',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Editar',exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver detalle de Superpuesto',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Ver detalle de Anterior',exact:true}).click();await expect(page.getByText(/Periodo histórico: solo consulta/)).toBeVisible();await expect(page.getByRole('button',{name:'Pagos de matrícula',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Mensualidades',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Estructura académica',exact:true}).click();await expect(page.getByRole('link',{name:'Gestionar estructura de este periodo'})).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver curso',exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Mis alumnos por curso',exact:true}).click();await expect(page.getByRole('link',{name:'Alumnos y curso',exact:true})).toHaveAttribute('href','/cursos/oferta/4');
 await page.goto('/periodos/3');await expect(page.getByRole('alert')).toContainText('Periodo no encontrado o fuera de sus asignaciones');await expect(page.getByText('Alumnos con matrícula activa',{exact:true})).toHaveCount(0);
});

test('detalle de periodo: errores de resumen y sección son visibles y recuperables',async({page})=>{
 await login(page);const path='**/api/periodos/2';await page.route(path,route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({success:false,message:'Fallo sintético del periodo'})}));await page.goto('/periodos/2');await expect(page.getByRole('alert')).toContainText('Fallo sintético del periodo');await expect(page.getByText('Alumnos con matrícula activa',{exact:true})).toHaveCount(0);
 await page.unroute(path);await page.getByRole('button',{name:'Reintentar detalle',exact:true}).click();await expect(page.getByRole('heading',{name:'Detalle del periodo: Anterior',exact:true})).toBeVisible();
 const payments='**/api/mensualidades**';await page.route(payments,route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({success:false,message:'Fallo sintético de mensualidades'})}));await page.getByRole('button',{name:'Mensualidades',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Fallo sintético de mensualidades');await expect(page.getByText('Total registrado',{exact:true})).toHaveCount(0);await page.unroute(payments);await page.getByRole('button',{name:'Reintentar sección',exact:true}).click();await expect(page.getByText('Sin registros en este periodo',{exact:true})).toBeVisible();
});
