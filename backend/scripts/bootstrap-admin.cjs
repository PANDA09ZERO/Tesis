'use strict';
const mysql=require('mysql2/promise');const {databaseSettings}=require('../dist/config/environment');const {accountError}=require('../dist/utils/accountValidation');const {encryptPasswordAsync}=require('../dist/utils/encrypt');
// Valores por variables de sesión privadas, nunca por argumentos ni defaults.
async function main(){
 const body={nombre:process.env.ADMIN_FIRST_NAME,apellido:process.env.ADMIN_LAST_NAME,email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD};
 const validation=accountError(body,true);if(validation)throw new Error(validation);
 const db=await mysql.createConnection(databaseSettings());try{
 await db.beginTransaction();
 const [roles]=await db.query("SELECT id FROM roles WHERE nombre='administrador' FOR UPDATE");if(roles.length!==1)throw new Error('Rol administrador ausente');
 const [admins]=await db.query('SELECT id FROM usuarios WHERE rol_id=? LIMIT 1',[roles[0].id]);if(admins.length)throw new Error('Ya existe un administrador; use el flujo de cuentas existente');
 await db.query('INSERT INTO usuarios(nombre,apellido,email,password_hash,rol_id) VALUES(?,?,?,?,?)',[body.nombre,body.apellido,body.email.trim(),await encryptPasswordAsync(body.password),roles[0].id]);
 await db.commit();console.log('Administrador inicial creado. No se generaron cuentas demo');
 }catch(error){await db.rollback();throw error;}finally{delete process.env.ADMIN_PASSWORD;await db.end();}}
main().catch(()=>{console.error('No se creó el administrador. Verifique datos, rol y ausencia de administrador previo');process.exitCode=1;});
