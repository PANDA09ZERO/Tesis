// Datos sintéticos solicitados para la instalación local. No usar el seed general.
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({path:path.resolve(__dirname,'../../.env')});
require('dotenv').config({path:path.resolve(__dirname,'../.env')});

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  if (process.env.NODE_ENV === 'production' || !['localhost','127.0.0.1','::1'].includes(host)) throw new Error('Solo instalación local de desarrollo');
  const apply = process.argv.includes('--apply');
  const db = await mysql.createConnection({host,port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER || 'root',password:process.env.DB_PASSWORD || '',database:process.env.DB_NAME || 'gestion_educativa',dateStrings:true,charset:'utf8mb4'});
  let committed = false;
  try {
    await db.beginTransaction();
    const [periods] = await db.query("SELECT id,nombre,DATE(UTC_TIMESTAMP()-INTERVAL 5 HOUR) hoy FROM periodos_academicos WHERE activo=1 AND DATE(UTC_TIMESTAMP()-INTERVAL 5 HOUR) BETWEEN fecha_inicio AND fecha_fin FOR UPDATE");
    if (periods.length !== 1 || periods[0].nombre !== '2026-II') throw new Error('Se esperaba únicamente el periodo vigente 2026-II; revisar antes de reutilizar');
    const period = periods[0];
    const [teachers] = await db.query('SELECT p.id,u.email FROM profesores p JOIN usuarios u ON u.id=p.usuario_id WHERE u.activo=1');
    const josias = teachers.find(t=>t.email.toLowerCase()==='josias@edu.com');
    const maria = teachers.find(t=>t.email.toLowerCase()==='profesor@escuela.edu');
    if (!josias || !maria) throw new Error('No se encontraron los docentes esperados');
    const [offers] = await db.query('SELECT o.*,g.nombre grado,g.nivel,c.nombre curso FROM periodo_grado_cursos o JOIN grados g ON g.id=o.grado_id JOIN cursos c ON c.id=o.curso_id WHERE o.periodo_academico_id=? ORDER BY o.id',[period.id]);
    const grades = ['1er Grado','4to Grado'].map(name=>{
      const matches = offers.filter(o=>o.grado===name && o.nivel==='Primaria');
      if (!matches.length || new Set(matches.map(o=>o.grado_id)).size!==1) throw new Error('Grado no disponible o ambiguo: '+name);
      return {id:matches[0].grado_id,name,offers:matches};
    });
    const math = grades[0].offers.find(o=>o.curso==='Matemáticas');
    if (!math) throw new Error('Oferta de Matemáticas no encontrada');
    const [assigned] = await db.query('SELECT * FROM periodo_grado_curso_profesores WHERE periodo_grado_curso_id=? FOR UPDATE',[math.id]);
    if (assigned.some(a=>a.profesor_id!==maria.id)) throw new Error('Matemáticas ya tiene otro responsable; no se cambia');
    let newAssignments = 0;
    if (!assigned.length) {
      await db.query('INSERT INTO periodo_grado_curso_profesores (periodo_grado_curso_id,profesor_id) VALUES (?,?)',[math.id,maria.id]);
      newAssignments++;
    }
    const [roles] = await db.query("SELECT id FROM roles WHERE nombre='alumno'");
    if (roles.length!==1) throw new Error('Rol alumno no disponible');
    let newStudents = 0, newEnrollments = 0;
    const marker = 'PRUEBA-DOCENTES-2026II';
    for (const grade of grades) {
      for (let i=1;i<=10;i++) {
        const code = `PD26-${grade.id}-${String(i).padStart(2,'0')}`;
        const email = `prueba.docentes.2026ii.g${grade.id}.${String(i).padStart(2,'0')}@example.invalid`;
        const [existing] = await db.query('SELECT a.id,a.codigo_alumno,u.nombre,u.rol_id FROM usuarios u LEFT JOIN alumnos a ON a.usuario_id=u.id WHERE u.email=?',[email]);
        let student;
        if (existing.length) {
          if (!existing[0].id || existing[0].codigo_alumno!==code || existing[0].nombre!=='Alumno Prueba' || existing[0].rol_id!==roles[0].id) throw new Error('Colisión con una cuenta ajena al lote');
          student=existing[0].id;
        } else {
          // Cada cuenta tiene una clave aleatoria no publicada; no cambia claves existentes.
          const hash=await bcrypt.hash(crypto.randomBytes(32).toString('base64url'),12);
          const [user]=await db.query('INSERT INTO usuarios (email,password_hash,nombre,apellido,dni,rol_id,activo) VALUES (?,?,?,?,NULL,?,1)',[email,hash,'Alumno Prueba',`G${grade.id} ${String(i).padStart(2,'0')}`,roles[0].id]);
          const [alumno]=await db.query('INSERT INTO alumnos (usuario_id,codigo_alumno,grado_id,periodo_academico_id,estado) VALUES (?,?,?,?,?)',[user.insertId,code,grade.id,period.id,'matriculado']);
          student=alumno.insertId;
          newStudents++;
        }
        for (const offer of grade.offers) {
          const [enrolled]=await db.query('SELECT id,grado_id,estado FROM matriculas WHERE alumno_id=? AND periodo_academico_id=? AND curso_id=?',[student,period.id,offer.curso_id]);
          if (enrolled.length) {
            if (enrolled[0].grado_id!==grade.id || enrolled[0].estado!=='activa') throw new Error('La matrícula de prueba fue modificada; revisar manualmente');
            continue;
          }
          await db.query("INSERT INTO matriculas (alumno_id,curso_id,periodo_academico_id,grado_id,fecha_matricula,estado,observaciones) VALUES (?,?,?, ?,?,'activa',?)",[student,offer.curso_id,period.id,grade.id,period.hoy,marker]);
          newEnrollments++;
        }
      }
    }
    const [coverage]=await db.query(`SELECT p.id profesor_id,COUNT(DISTINCT m.alumno_id) alumnos_prueba,COUNT(DISTINCT o.id) ofertas_con_alumnos
      FROM profesores p JOIN usuarios u ON u.id=p.usuario_id
      LEFT JOIN periodo_grado_curso_profesores x ON x.profesor_id=p.id
      LEFT JOIN periodo_grado_cursos o ON o.id=x.periodo_grado_curso_id AND o.periodo_academico_id=?
      LEFT JOIN matriculas m ON m.curso_id=o.curso_id AND m.grado_id=o.grado_id AND m.periodo_academico_id=o.periodo_academico_id AND m.estado='activa' AND m.observaciones=?
      WHERE u.activo=1 GROUP BY p.id`,[period.id,marker]);
    if (coverage.some(t=>t.alumnos_prueba<10)) throw new Error('Algún docente no tiene alumnos de prueba: se revierte el lote');
    const [duplicates]=await db.query('SELECT alumno_id,curso_id,COUNT(*) total FROM matriculas WHERE periodo_academico_id=? AND observaciones=? GROUP BY alumno_id,curso_id HAVING COUNT(*)>1',[period.id,marker]);
    if (duplicates.length) throw new Error('Matrículas duplicadas');
    if (apply) {await db.commit();committed=true;}
    console.log(JSON.stringify({modo:apply?'aplicado':'simulacion_sin_guardar',periodo:period.nombre,nuevos_alumnos:newStudents,nuevas_inscripciones:newEnrollments,nuevas_asignaciones:newAssignments,profesores:coverage,josias_profesor_id:josias.id,duplicados:duplicates.length},null,2));
  } finally {
    if (!committed) await db.rollback();
    await db.end();
  }
}
main().catch(error=>{console.error('Lote no completado:',error.code || error.message);process.exitCode=1;});
