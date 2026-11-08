'use strict';
// Solo lectura; no convierte ni elimina asignaciones generales.
const mysql=require('mysql2/promise');const {databaseSettings}=require('../dist/config/environment');
async function diagnose(db){const [rows]=await db.query(`SELECT
 (SELECT COUNT(*) FROM periodo_grado_curso_profesores) asignaciones_especificas,
 (SELECT COUNT(*) FROM horarios WHERE periodo_grado_curso_id IS NULL) horarios_sin_oferta,
 (SELECT COUNT(*) FROM periodo_grado_curso_profesores a JOIN profesores p ON p.id=a.profesor_id JOIN usuarios u ON u.id=p.usuario_id WHERE u.activo=0) asignaciones_inactivas,
 (SELECT COUNT(*) FROM periodo_grado_curso_profesores a WHERE NOT EXISTS(SELECT 1 FROM profesores p WHERE p.id=a.profesor_id) OR NOT EXISTS(SELECT 1 FROM periodo_grado_cursos g WHERE g.id=a.periodo_grado_curso_id)) asignaciones_especificas_huerfanas`);return rows[0];}
module.exports={diagnose};
if(require.main===module)(async()=>{const db=await mysql.createConnection(databaseSettings());try{console.log(JSON.stringify(await diagnose(db),null,2));}finally{await db.end();}})().catch(()=>{console.error('No se pudo completar el diagnóstico. Revisa conexión y esquema; no se modificaron registros');process.exitCode=1;});
