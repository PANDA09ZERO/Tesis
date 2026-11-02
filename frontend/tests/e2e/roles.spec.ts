import {test,expect} from '@playwright/test';
async function login(page:any,id:number){
 await page.goto('/login');await page.locator('input[type=email]').fill(`user${id}@test.local`);await page.locator('input[type=password]').fill('originalTest');await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);
}
test('login sin credenciales demo, errores visibles y diseño adaptable',async({page},testInfo)=>{
 await page.goto('/login');await expect(page.getByRole('heading',{name:'Ciencias e Ingeniería'})).toBeVisible();await expect(page.getByText('admin@escuela.edu')).toHaveCount(0);
 await page.getByRole('button',{name:'Iniciar Sesión',exact:true}).click();await expect(page.getByText('Complete todos los campos')).toBeVisible();
 const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);await page.screenshot({path:testInfo.outputPath('login.png'),fullPage:true});
});
for(const {role,id,path}of [{role:'administrador',id:1,path:'/admin/pagos'},{role:'profesor',id:2,path:'/dashboard'},{role:'alumno',id:11,path:'/estudiante/cursos'},{role:'apoderado',id:21,path:'/familia/alumnos'}]){
 test(`${role}: login real, navegación directa y persistencia tras recarga`,async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page,id);await page.goto(path);await expect(page.locator('main')).toBeVisible();await page.reload();await expect(page).toHaveURL(new RegExp(path+'$'));await expect(page.locator('main')).toBeVisible();expect(errors).toEqual([]);await expect(page.getByRole('alert')).toHaveCount(0);if(role==='profesor'){await expect(page.getByText('Mis alumnos',{exact:true})).toBeVisible();await expect(page.locator('select').first()).toHaveValue('1');await expect(page.getByRole('button',{name:/Compartido · Primero/})).toBeVisible();}await page.screenshot({path:testInfo.outputPath(role+'.png'),fullPage:true});
  if(role!=='administrador'){await page.goto('/admin/usuarios');await expect(page).not.toHaveURL(/\/admin\/usuarios$/);}
 });
}
