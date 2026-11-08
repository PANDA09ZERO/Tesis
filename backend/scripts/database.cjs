'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const mysql=require('mysql2/promise');
const {databaseSettings}=require('../dist/config/environment');
const version='20261108_incidencias';
const schemaPath=path.resolve(__dirname,'../../database/schema.sql');
const identifier=value=>{if(!/^[a-zA-Z0-9_]+$/.test(value||''))throw new Error('Identificador de base inválido');return '`'+value+'`';};
async function schema(){const source=(await fs.readFile(schemaPath,'utf8')).replace(/\r\n/g,'\n');return {source,sql:source.replace(/^CREATE DATABASE[^;]+;\s*/,'').replace(/^USE[^;]+;\s*/,''),checksum:createHash('sha256').update(source).digest('hex')};}
async function checkSchema(db){
 const {source}=await schema();const missing=[];
 const [columns]=await db.query('SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()');
 const existing=new Set(columns.map(c=>c.TABLE_NAME+'.'+c.COLUMN_NAME));
 for(const match of source.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? (\w+) \(([\s\S]*?)\n\)(?: ENGINE[^;]*)?;/g)){
  const table=match[1],body=match[2];
  for(const line of body.split('\n')){const col=line.match(/^\s+(\w+)\s+(?:INT|VARCHAR|TEXT|DATE|TIMESTAMP|ENUM|DECIMAL|TINYINT|BIGINT|JSON|YEAR|TIME)\b/i);if(col&&!existing.has(table+'.'+col[1]))missing.push(table+'.'+col[1]);}
 }
 const [indexes]=await db.query('SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX');
 for(const [table,cols] of [['pagos_matricula',['alumno_id','periodo_academico_id']],['mensualidades',['alumno_id','periodo_academico_id','mes','año']],['sueldos',['profesor_id','mes','año']],['calificaciones',['evaluacion_id','alumno_id']]]){
  const groups=new Map();for(const i of indexes.filter(i=>i.TABLE_NAME===table&&!i.NON_UNIQUE)){const a=groups.get(i.INDEX_NAME)||[];a.push(i.COLUMN_NAME);groups.set(i.INDEX_NAME,a);}
  if(![...groups.values()].some(a=>JSON.stringify(a)===JSON.stringify(cols)))missing.push(table+': UNIQUE('+cols.join(',')+')');
 }
 return {compatible:missing.length===0,missing};
}
async function record(db,checksum){await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');await db.query('INSERT INTO schema_migrations(version,checksum) VALUES(?,?)',[version,checksum]);}
async function install(db){
 const [tables]=await db.query('SHOW TABLES');if(tables.length)throw new Error('Instalación bloqueada: la base debe estar vacía. No se sobrescriben tablas');
 const {sql,checksum}=await schema();
 // Solo SQL del repositorio revisado; jamás entradas HTTP ni nombres interpolados.
 for(const statement of sql.replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await db.query(statement);
 const result=await checkSchema(db);if(!result.compatible)throw new Error('El esquema instalado no cumple el contrato');
 await record(db,checksum);return {installed:version};
}
async function preflight(db){
 const structural=await checkSchema(db);if(structural.missing.some(item=>!item.includes(': UNIQUE')))return {ready:false,schema:structural};
 const [legacy]=await db.query("SELECT COUNT(*) total FROM usuarios WHERE activo=1 AND password_hash NOT REGEXP '^[$]2[aby][$][0-9]{2}[$]'");
 const [active]=await db.query('SELECT COUNT(*) total FROM periodos_academicos WHERE activo=1');
 const [admins]=await db.query('SELECT COUNT(*) total FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.activo=1 AND r.nombre=?',['administrador']);
 const [demo]=await db.query("SELECT COUNT(*) total FROM usuarios WHERE activo=1 AND email IN ('admin@escuela.edu','profesor@escuela.edu','alumno@escuela.edu','apoderado@escuela.edu')");
 const blockers=structural.compatible?[]:['Faltan índices únicos requeridos; revisar migración'];if(legacy[0].total)blockers.push('Cuentas activas sin bcrypt: '+legacy[0].total);if(active[0].total>1)blockers.push('Varios periodos activos');if(!admins[0].total)blockers.push('Falta administrador activo');if(demo[0].total)blockers.push('Revisar cuentas demo: '+demo[0].total);
 const [ledger]=await db.query("SELECT COUNT(*) total FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='schema_migrations'");
 if(!ledger[0].total)blockers.push('Falta registrar una baseline revisada');
 else{const [versions]=await db.query('SELECT checksum FROM schema_migrations WHERE version=?',[version]);const {checksum}=await schema();if(versions.length!==1||versions[0].checksum!==checksum)blockers.push('Versión de esquema ausente o checksum diferente; revisar migraciones');}
 return {ready:!blockers.length,blockers,schema:structural};
}
async function main(){const command=process.argv[2]||'check';const db=await mysql.createConnection(databaseSettings());try{
 let result;
 if(command==='install'){if(!process.argv.includes('--empty-database-confirmed'))throw new Error('Falta --empty-database-confirmed');result=await install(db);}
 else if(command==='baseline'){if(!process.argv.includes('--backup-confirmed')||!process.argv.includes('--schema-reviewed'))throw new Error('Falta respaldo y revisión de estructura/tipos/FKs');result=await checkSchema(db);if(!result.compatible)throw new Error('Esquema incompatible; revisar migraciones sin aplicarlas a ciegas');const {checksum}=await schema();await record(db,checksum);}
 else if(command==='check')result=await checkSchema(db);
 else if(command==='preflight')result=await preflight(db);
 else throw new Error('Use install, check, baseline o preflight');
 console.log(JSON.stringify(result,null,2));if(result.compatible===false||result.ready===false)process.exitCode=1;
 }finally{await db.end();}}
module.exports={install,checkSchema,preflight,identifier};
if(require.main===module)main().catch(error=>{console.error(JSON.stringify({error:'Operación DB fallida',code:error.code||'REVIEW_REQUIRED'}));process.exitCode=1;});
