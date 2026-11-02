const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const {crc32}=require('node:zlib');
process.env.NODE_ENV='test';
const {applicationSettings,databaseSettings,integerSetting}=require('../dist/config/environment');
const {accountError}=require('../dist/utils/accountValidation');const {finishTransaction}=require('../dist/utils/transaction');const {validDocx,hasExpectedSignature}=require('../dist/utils/documentValidation');
const production={NODE_ENV:'production',JWT_SECRET:'8f'.repeat(48),CORS_ORIGINS:'https://portal.example.edu',UPLOAD_DIRECTORY:path.resolve(os.tmpdir(),'production-uploads'),DB_HOST:'mysql.internal',DB_NAME:'tesis',DB_USER:'api',DB_PASSWORD:'private'};
test('producción exige secretos fuertes, CORS exacto, volumen absoluto y usuario limitado',()=>{
 assert.equal(applicationSettings(production).production,true);assert.equal(databaseSettings(production).user,'api');
 for(const change of [{JWT_SECRET:''},{JWT_SECRET:'demo'.repeat(20)},{CORS_ORIGINS:'*'},{CORS_ORIGINS:'http://example.edu'},{CORS_ORIGINS:'https://example.edu/path'},{UPLOAD_DIRECTORY:''},{UPLOAD_DIRECTORY:'uploads'},{TRUST_PROXY:'true'},{TRUST_PROXY:'1'},{TRUST_PROXY:'0.0.0.0/0'},{TRUST_PROXY:'loopback,0.0.0.0/0'},{TRUST_PROXY:'127.0.0.1/99'},{NODE_ENV:'Production'},{ALLOW_LEGACY_PASSWORDS:'true'}])assert.throws(()=>applicationSettings({...production,...change}));
 for(const change of [{DB_USER:'root'},{DB_PASSWORD:''},{DB_NAME:''},{DB_PORT:'bad'},{DB_SSL:'false-but-insecure'}])assert.throws(()=>databaseSettings({...production,...change}));
});
test('pool, puertos y TLS validan tipos y mantienen verificación de certificados',()=>{
 assert.equal(databaseSettings({...production,DB_SSL:'true'}).ssl.rejectUnauthorized,true);
 for(const value of ['NaN','1e3','-1','',true])assert.throws(()=>integerSetting({X:value},'X',10));
 assert.equal(applicationSettings({...production,PORT:'0'}).port,0);
});
test('altas manuales y credenciales generadas validan políticas y límites de esquema',()=>{
 const body={nombre:'Persona',apellido:'Prueba',email:'cuenta@example.test',password:'Private123'};assert.equal(accountError(body,true),null);
 for(const change of [{password:undefined},{password:''},{password:'123'},{password:'é'.repeat(37)},{email:'invalid'},{nombre:[]},{telefono:'1'.repeat(21)},{ocupacion:'a'.repeat(101)},{genero:'X'},{activo:'sí'},{fecha_nacimiento:'2026-02-30'},{cursos:[1,'1']},{cursos:[true]}])assert.ok(accountError({...body,...change},true));
 assert.equal(accountError({nombre:'Persona',apellido:'Prueba'},true,true),null);
 assert.match(accountError({nombre:'Persona',apellido:'Prueba',password:'birth-date'},true,true),/generan automáticamente/);
 assert.equal(accountError({password:''},false),null);
});
test('conexiones se liberan tras éxito/rollback y se destruyen si falla rollback',async()=>{
 const calls=[];const db={rollback:async()=>calls.push('rollback'),release:()=>calls.push('release'),destroy:()=>calls.push('destroy')};
 await finishTransaction(undefined,false);await finishTransaction(db,true);await finishTransaction(db,false);assert.deepEqual(calls,['release','rollback','release']);
 calls.length=0;db.rollback=async()=>{throw Error('DB caída');};await finishTransaction(db,false);assert.deepEqual(calls,['destroy']);
});
// ZIP almacenado mínimo con CRC real, sin dependencias de herramientas externas.
function zip(entries){let offset=0;const locals=[],central=[];for(const [name,value]of entries){const n=Buffer.from(name),v=Buffer.from(value),h=Buffer.alloc(30),c=Buffer.alloc(46);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt32LE(crc32(v),14);h.writeUInt32LE(v.length,18);h.writeUInt32LE(v.length,22);h.writeUInt16LE(n.length,26);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc32(v),16);c.writeUInt32LE(v.length,20);c.writeUInt32LE(v.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42);locals.push(h,n,v);central.push(c,n);offset+=30+n.length+v.length;}
 const end=Buffer.alloc(22),cent=Buffer.concat(central);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cent.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,cent,end]);}
const docxEntries=[['[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],['word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>']];
test('DOCX valida estructura; rechaza ZIP disfrazado, truncamiento, duplicados y rutas peligrosas',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'tesis-docx-'));try{const file=path.join(dir,'document.docx');
 for(const [entries,expected]of [[docxEntries,true],[[['other.txt','nada']],false],[[...docxEntries,['../outside.txt','bad']],false],[[...docxEntries,docxEntries[1]],false],[[docxEntries[0],['word/document.xml','<!DOCTYPE x><w:document/>']],false]]){await fs.writeFile(file,zip(entries));assert.equal(await validDocx(file),expected);}
 await fs.writeFile(file,zip(docxEntries).subarray(0,20));assert.equal(await validDocx(file),false);
 await fs.writeFile(file,'%PDF-test');assert.equal(await hasExpectedSignature(file,'.pdf'),true);assert.equal(await hasExpectedSignature(file,'.png'),false);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('logs de producción nunca imprimen SQL, hashes ni stack',()=>{
 const old=process.env.NODE_ENV,previous=console.error,lines=[];try{process.env.NODE_ENV='production';console.error=(...a)=>lines.push(a.join(' '));require('../dist/utils/logger').logError('Operación de prueba',Object.assign(Error('SQL password_hash=private'),{code:'ER_DUP_ENTRY',sql:'private'}));assert.equal(lines.length,1);assert.ok(!lines[0].includes('private'));assert.equal(JSON.parse(lines[0]).code,'ER_DUP_ENTRY');}finally{console.error=previous;process.env.NODE_ENV=old;}
});
module.exports={zip,docxEntries};
test('migración no borra ni fusiona sueldos históricos duplicados',async()=>{
 const {migrate}=require('../scripts/migrate-production.cjs');const statements=[];
 const result=await migrate({query:async sql=>{statements.push(sql);return sql.includes('COUNT(*) total')?[[{total:2}]]:[[]];}},true);
 assert.equal(result.blocked,true);assert.equal(result.duplicateGroups,2);assert.ok(statements.every(sql=>sql.startsWith('SELECT')));
});
test('bcrypt asíncrono permite credenciales válidas y producción rechaza legado reversible',async()=>{
 const {encryptPasswordAsync,verifyPasswordAsync,encrypt}=require('../dist/utils/encrypt');const previous=process.env.NODE_ENV;
 try{const hashed=await encryptPasswordAsync('Private-2026');process.env.NODE_ENV='production';assert.equal(await verifyPasswordAsync('Private-2026',hashed),true);assert.equal(await verifyPasswordAsync('Incorrect',hashed),false);assert.equal(await verifyPasswordAsync('Private-2026','Private-2026'),false);assert.equal(await verifyPasswordAsync('Private-2026',encrypt('Private-2026')),false);}finally{process.env.NODE_ENV=previous;}
});
function response(){return {code:200,status(n){this.code=n;return this;},json(value){this.body=value;return this;}};}
test('fallo al adquirir conexión en altas/ediciones administrativas responde 500',async()=>{
 const dbPath=require.resolve('../dist/config/database');require.cache[dbPath]={exports:{__esModule:true,default:{getConnection:async()=>{throw Error('Sin conexión');}}}};
 for(const [file,functions]of [['alumnos',['createAlumno','updateAlumno']],['profesores',['createProfesor','updateProfesor']],['apoderados',['createApoderado','updateApoderado']]]){
  const controller=require('../dist/controllers/'+file+'.controller');for(const name of functions){const res=response();await controller[name]({params:{id:'1'},body:{nombre:'Prueba',apellido:'Cuenta'}},res);assert.equal(res.code,500,name);assert.equal(res.body.success,false);}
 }
});
test('readiness informa 503 ante DB caída y timeout, sin detalles internos',async()=>{
 const dbPath=require.resolve('../dist/config/database'),temp=await fs.mkdtemp(path.join(os.tmpdir(),'tesis-ready-'));
 const previous={UPLOAD_DIRECTORY:process.env.UPLOAD_DIRECTORY,READINESS_TIMEOUT_MS:process.env.READINESS_TIMEOUT_MS};
 try{process.env.UPLOAD_DIRECTORY=temp;process.env.READINESS_TIMEOUT_MS='10';
  let query=async()=>{throw Error('DB SQL secret');};require.cache[dbPath]={exports:{__esModule:true,default:{query:(...args)=>query(...args)}}};
  const {readiness}=require('../dist/controllers/health.controller');let res=response();await readiness({},res);assert.equal(res.code,503);assert.deepEqual(res.body,{status:'unavailable'});
  query=()=>new Promise(resolve=>setTimeout(resolve,30));res=response();await readiness({},res);assert.equal(res.code,503);await new Promise(resolve=>setTimeout(resolve,40));assert.deepEqual(await fs.readdir(temp),[]);
 }finally{for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;await fs.rm(temp,{recursive:true,force:true});}
});
