'use strict';
const mysql=require('mysql2/promise');const {createPrivatePrompt}=require('./private-prompt.cjs');
const {databaseSettings}=require('../dist/config/environment');const {accountError}=require('../dist/utils/accountValidation');const {encryptPasswordAsync}=require('../dist/utils/encrypt');
async function provision(db,action,body){
 if(!['create','prepare','reset-password','activate','deactivate'].includes(action))throw Error('Acción inválida');
 const password=action==='prepare'?require('node:crypto').randomBytes(32).toString('base64url'):body.password;
 if(typeof body.email!=='string'||!body.email.includes('@'))throw Error('Email inválido');
 if(['create','prepare'].includes(action)){const error=accountError({...body,password},true);if(error)throw Error(error);}
 if(['create','prepare','reset-password','activate'].includes(action)&&(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>72))throw Error('Contraseña: mínimo 12 caracteres y máximo 72 bytes');
 await db.beginTransaction();
 try{
  await db.query("INSERT INTO roles(nombre,descripcion) VALUES('superadministrador','Control operativo institucional') ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)");
  const [roles]=await db.query("SELECT id FROM roles WHERE nombre='superadministrador' FOR UPDATE");
  const [accounts]=await db.query('SELECT id,email FROM usuarios WHERE rol_id=? FOR UPDATE',[roles[0].id]);
  let id;
  if(['create','prepare'].includes(action)){
   if(accounts.length)throw Error('La supercuenta ya existe; usa recuperación o activación');
   const [result]=await db.query('INSERT INTO usuarios(nombre,apellido,email,password_hash,rol_id,activo) VALUES(?,?,?,?,?,?)',[body.nombre.trim(),body.apellido.trim(),body.email.trim(),await encryptPasswordAsync(password),roles[0].id,action==='prepare'?0:1]);id=result.insertId;
  }else{
   const account=accounts.find(a=>a.email.toLowerCase()===body.email.trim().toLowerCase());if(!account)throw Error('Supercuenta no encontrada');id=account.id;
   if(action==='reset-password')await db.query('UPDATE usuarios SET password_hash=? WHERE id=?',[await encryptPasswordAsync(body.password),id]);
   else if(action==='deactivate')await db.query('UPDATE usuarios SET activo=0,password_hash=? WHERE id=?',[await encryptPasswordAsync(require('node:crypto').randomBytes(32).toString('base64url')),id]);
   else await db.query('UPDATE usuarios SET activo=1,password_hash=? WHERE id=?',[await encryptPasswordAsync(password),id]);
  }
  if(['create','prepare'].includes(action))await require('../dist/utils/operations').initializeOperations();
  await db.query("INSERT INTO registro_actividades(usuario_id,accion,entidad,detalles) VALUES(?,?,'operaciones',?)",[id,'supercuenta_'+action,JSON.stringify({canal:'consola_del_operador'})]);
  await db.commit();
 }catch(error){await db.rollback();throw error;}
}
async function main(){
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('Se requiere terminal interactiva privada');
 const action=process.argv[2]||'create';
 if(!['create','prepare','reset-password','activate','deactivate'].includes(action))throw Error('Acción inválida');
 const prompt=createPrivatePrompt();const ask=(text,secret=false)=>prompt.ask(text,secret);
 let db;
 try{const body={email:await ask('Email de la supercuenta: ')};
  if(['create','prepare'].includes(action)){body.nombre=await ask('Nombre: ');body.apellido=await ask('Apellido: ');}
  if(['create','reset-password','activate'].includes(action)){body.password=await ask('Contraseña (no se muestra): ',true);const repeat=await ask('Repite la contraseña: ',true);if(body.password!==repeat)throw Error('Las contraseñas no coinciden');}
  db=await mysql.createConnection(databaseSettings());await provision(db,action,body);delete body.password;console.log(action==='prepare'?'Cuenta preparada e inactiva. Ejecuta activate para definir la contraseña y habilitar el acceso.':'Operación completada. La cuenta utiliza el login habitual y no aparece en Usuarios.');
 }finally{prompt.close();if(db)await db.end();}
}
module.exports={provision};
function publicError(error){
 const safe=new Set(['Acción inválida','Email inválido','Se requiere terminal interactiva privada','Las contraseñas no coinciden','Contraseña: mínimo 12 caracteres y máximo 72 bytes','La supercuenta ya existe; usa recuperación o activación','Supercuenta no encontrada']);
 if(safe.has(error?.message))return error.message;
 if(error?.code==='CLI_INPUT_CLOSED')return 'Se cerró o canceló la entrada del terminal. Ejecuta nuevamente el comando y espera cada pregunta.';
 if(['ECONNREFUSED','ETIMEDOUT','EACCES','ENOTFOUND'].includes(error?.code))return 'No se pudo conectar al servidor o acceder al almacén. Revisa la configuración local y sus permisos.';
 if(error?.code==='ER_ACCESS_DENIED_ERROR')return 'MySQL rechazó el acceso. Revisa las credenciales configuradas del backend.';
 if(error?.code==='ER_DUP_ENTRY')return 'El correo ya está registrado. No se modificó la cuenta existente.';
 return 'No se completó la operación. Revisa configuración, permisos y conexión. No se muestran detalles internos ni credenciales.';
}
module.exports.publicError=publicError;
if(require.main===module)main().catch(error=>{console.error(publicError(error));process.exitCode=1;});
