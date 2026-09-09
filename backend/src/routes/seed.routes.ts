import { Router } from 'express';
import { sendError, sendSuccess } from '../utils/response';
import { authenticate, authorize } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

const router = Router();

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
    console.error('Error al crear usuarios de prueba:', error);
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
      `INSERT IGNORE INTO alumnos (usuario_id, codigo_alumno, grado_id, seccion_id, periodo_academico_id)
       SELECT u.id, 'ALU-2026-001', 4, 7, (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1)
       FROM usuarios u WHERE u.email = 'alumno@escuela.edu'`
    );

    await pool.query(
      `INSERT IGNORE INTO apoderados (usuario_id, ocupacion)
       SELECT id, 'Comerciante' FROM usuarios WHERE email = 'apoderado@escuela.edu'`
    );

    return res.status(200).json({
      success: true,
      message: 'Relaciones creadas (profesor, alumno, apoderado)',
      data: null
    });
  } catch (error) {
    console.error('Error al crear relaciones:', error);
    return sendError(res, 'Error al crear relaciones');
  }
});

export default router;