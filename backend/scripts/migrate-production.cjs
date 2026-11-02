const mysql=require('mysql2/promise');const {databaseSettings}=require('../dist/config/environment');
async function migrate(db,apply=false){
 const [duplicate]=await db.query('SELECT COUNT(*) total FROM (SELECT profesor_id,mes,año FROM sueldos GROUP BY profesor_id,mes,año HAVING COUNT(*)>1) d');
 const [keys]=await db.query("SELECT INDEX_NAME,COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sueldos' AND NON_UNIQUE=0 ORDER BY INDEX_NAME,SEQ_IN_INDEX");
 const groups=new Map();for(const row of keys){const group=groups.get(row.INDEX_NAME)||[];group.push(row.COLUMN_NAME);groups.set(row.INDEX_NAME,group);}
 const exists=[...groups.values()].some(columns=>columns.join(',')==='profesor_id,mes,año');
 if(exists)return {changed:false,pending:false};
 if(duplicate[0].total)return {changed:false,pending:true,blocked:true,duplicateGroups:Number(duplicate[0].total)};
 if(!apply)return {changed:false,pending:true,action:'ADD UNIQUE sueldos(profesor_id,mes,año)'};
 await db.query('ALTER TABLE sueldos ADD UNIQUE KEY unique_sueldo_mensual(profesor_id,mes,año)');
 return {changed:true,pending:false};
}
async function main(){const apply=process.argv.includes('--apply');if(apply&&(!process.argv.includes('--backup-confirmed')||!process.argv.includes('--maintenance-confirmed')))throw new Error('Falta respaldo/restauración y mantenimiento confirmados');const db=await mysql.createConnection(databaseSettings());try{const result=await migrate(db,apply);console.log(JSON.stringify(result));if(result.blocked)process.exitCode=1;}finally{await db.end();}}
module.exports={migrate};if(require.main===module)main().catch(()=>{console.error('Migración no completada. No se borraron ni fusionaron pagos; revisar el destino');process.exitCode=1;});
