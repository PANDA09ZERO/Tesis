import { logError } from '../utils/logger';
import { Router } from 'express';
import { sendError, sendSuccess } from '../utils/response';
import { authenticate, authorize } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

router.use((_req,res,next)=>{if(process.env.NODE_ENV==='production'||process.env.ENABLE_DEMO_SEED!=='true')return sendError(res,'Ruta no disponible',404);next();});
router.use(authenticate);
router.use(authorize('administrador'));

router.post('/seed-users', async (_req, res) => {
  try {
    const users = [
      { email: 'admin@escuela.edu', password: 'admin123', nombre: 'Carlos', apellido: 'Mendoza', dni: '12345678', rol_id: 1 },
      { email: 'profesor@escuela.edu', password: 'prof123', nombre: 'Maria', apellido: 'Garcia', dni: '23456789', rol_id: 2 },
      { email: 'alumno@escuela.edu', password: 'alu123', nombre: 'Juan', apellido: 'Perez', dni: '34567890', rol_id: 3 },
      { email: 'apoderado@escuela.edu', password: 'apo123', nombre: 'Rosa', apellido: 'Perez', dni: '45678901', rol_id: 4 }
    ];

    const results = [];
    for (const u of users) {
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM usuarios WHERE email = ?', [u.email]
      );
      if (existing.length > 0) {
        results.push({ email: u.email, status: 'ya existe' });
        continue;
      }
      const passwordHash = await bcrypt.hash(u.password, 12);
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO usuarios (email, password_hash, nombre, apellido, dni, rol_id) VALUES (?, ?, ?, ?, ?, ?)',
        [u.email, passwordHash, u.nombre, u.apellido, u.dni, u.rol_id]
      );
      results.push({ email: u.email, status: 'creado', id: result.insertId });
    }

    return res.status(200).json({
      success: true,
      message: 'Usuarios de prueba creados',
      data: results
    });
  } catch (error) {
    logError('Error al crear usuarios de prueba:', error);
    return sendError(res, 'Error al crear usuarios de prueba');
  }
});

router.post('/seed-relaciones', async (_req, res) => {
  try {
    await pool.query(
      `INSERT IGNORE INTO profesores (usuario_id, especialidad, titulo_profesional, fecha_ingreso)
       SELECT id, 'Matemáticas y Ciencias', 'Licenciada en Educación', '2020-03-01'
       FROM usuarios WHERE email = 'profesor@escuela.edu'`
    );

    await pool.query(
      `INSERT IGNORE INTO alumnos (usuario_id, codigo_alumno, grado_id, periodo_academico_id)
      SELECT u.id, 'ALU-2026-001',
        (SELECT id FROM grados WHERE nombre = '1er Grado' AND nivel = 'Primaria' ORDER BY id DESC LIMIT 1),
        (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1)
       FROM usuarios u WHERE u.email = 'alumno@escuela.edu'`
    );

    await pool.query(
      `INSERT IGNORE INTO apoderados (usuario_id, ocupacion)
       SELECT id, 'Comerciante' FROM usuarios WHERE email = 'apoderado@escuela.edu'`
    );

    await pool.query(
      `INSERT IGNORE INTO apoderado_alumno (apoderado_id, alumno_id, parentesco)
       SELECT ap.id, al.id, 'Apoderado'
       FROM apoderados ap
       JOIN usuarios ua ON ua.id = ap.usuario_id
       JOIN alumnos al ON al.codigo_alumno = 'ALU-2026-001'
       WHERE ua.email = 'apoderado@escuela.edu'`
    );

    await pool.query(
      `INSERT IGNORE INTO periodo_grado_curso_profesores (profesor_id, periodo_grado_curso_id)
       SELECT DISTINCT p.id, pgc.id
       FROM profesores p
       JOIN usuarios u ON u.id = p.usuario_id
       JOIN matriculas m ON m.estado = 'activa'
       JOIN periodo_grado_cursos pgc ON pgc.periodo_academico_id=m.periodo_academico_id AND pgc.curso_id=m.curso_id AND pgc.grado_id=COALESCE(m.grado_id,(SELECT grado_id FROM cursos WHERE id=m.curso_id))
       WHERE u.email = 'profesor@escuela.edu'`
    );

    return res.status(200).json({
      success: true,
      message: 'Relaciones creadas (profesor, alumno, apoderado)',
      data: null
    });
  } catch (error) {
    logError('Error al crear relaciones:', error);
    return sendError(res, 'Error al crear relaciones');
  }
});

export default router;