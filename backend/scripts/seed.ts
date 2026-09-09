import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

async function main() {
  console.log('=== Seed del Sistema de Gestión Educativa ===');

  const connection = await mysql.createConnection(dbConfig);

  // 1. Crear base de datos y schema
  console.log('1. Creando base de datos y tablas...');
  const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await connection.query(schemaSql);
  console.log('   - Schema aplicado correctamente');

  const database = process.env.DB_NAME || 'gestion_educativa';
  await connection.query(`USE ${database}`);

  // 2. Datos de catálogo
  console.log('2. Insertando datos de catálogo...');
  const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  await connection.query(seedSql);
  console.log('   - Grados, secciones, periodos y cursos creados');

  // 3. Crear usuarios con hashes bcrypt válidos
  console.log('3. Creando usuarios de prueba...');
  const users = [
    { email: 'admin@escuela.edu', password: 'admin123', nombre: 'Carlos', apellido: 'Mendoza', dni: '12345678', rol_id: 1 },
    { email: 'profesor@escuela.edu', password: 'prof123', nombre: 'Maria', apellido: 'Garcia', dni: '23456789', rol_id: 2 },
    { email: 'alumno@escuela.edu', password: 'alu123', nombre: 'Juan', apellido: 'Perez', dni: '34567890', rol_id: 3 },
    { email: 'apoderado@escuela.edu', password: 'apo123', nombre: 'Rosa', apellido: 'Perez', dni: '45678901', rol_id: 4 }
  ];

  const userIds: Record<string, number> = {};
  for (const u of users) {
    const [existing]: any = await connection.query('SELECT id FROM usuarios WHERE email = ?', [u.email]);
    if (existing.length > 0) {
      userIds[u.email] = existing[0].id;
      console.log(`   - ${u.email} ya existe (id=${existing[0].id})`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 12);
    const [result]: any = await connection.query(
      'INSERT INTO usuarios (email, password_hash, nombre, apellido, dni, rol_id) VALUES (?, ?, ?, ?, ?, ?)',
      [u.email, passwordHash, u.nombre, u.apellido, u.dni, u.rol_id]
    );
    userIds[u.email] = result.insertId;
    console.log(`   - ${u.email} creado (id=${result.insertId})`);
  }

  // 4. Relaciones (profesor, alumno, apoderado)
  console.log('4. Creando relaciones (profesor, alumno, apoderado)...');

  const [profId]: any = await connection.query(
    `INSERT IGNORE INTO profesores (usuario_id, especialidad, titulo_profesional, fecha_ingreso)
     SELECT id, 'Matemáticas y Ciencias', 'Licenciada en Educación', '2020-03-01'
     FROM usuarios WHERE email = 'profesor@escuela.edu'`
  );

  const [alumnoId]: any = await connection.query(
    `INSERT IGNORE INTO alumnos (usuario_id, codigo_alumno, grado_id, seccion_id, periodo_academico_id)
     SELECT u.id, 'ALU-2026-001', 4, 7, (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1)
     FROM usuarios u WHERE u.email = 'alumno@escuela.edu'`
  );

  await connection.query(
    `INSERT IGNORE INTO apoderados (usuario_id, ocupacion)
     SELECT id, 'Comerciante' FROM usuarios WHERE email = 'apoderado@escuela.edu'`
  );

  // Obtener ids para las siguientes inserciones
  const [profRows]: any = await connection.query(
    'SELECT p.id FROM profesores p JOIN usuarios u ON p.usuario_id = u.id WHERE u.email = ?',
    ['profesor@escuela.edu']
  );
  const [alumnoRows]: any = await connection.query(
    'SELECT a.id FROM alumnos a JOIN usuarios u ON a.usuario_id = u.id WHERE u.email = ?',
    ['alumno@escuela.edu']
  );
  const profesorId = profRows[0].id;
  const alumnoIdNum = alumnoRows[0].id;

  // 5. Horarios
  console.log('5. Creando horarios, matrículas y calificaciones...');
  const cursos: any = await connection.query(
    'SELECT id, codigo FROM cursos WHERE grado_id = 4'
  );
  const cursosList: any[] = cursos[0];

  const horariosDatos = [
    ['Lunes', '08:00', '09:00', 'Aula 101'],
    ['Lunes', '09:00', '10:00', 'Aula 101'],
    ['Martes', '08:00', '09:00', 'Aula 101'],
    ['Martes', '09:00', '10:00', 'Aula 101'],
    ['Miercoles', '08:00', '09:00', 'Aula 101'],
    ['Miercoles', '09:00', '10:00', 'Aula 101'],
    ['Jueves', '08:00', '09:00', 'Patio'],
    ['Viernes', '08:00', '09:00', 'Aula 101']
  ];

  for (let i = 0; i < cursosList.length; i++) {
    const curso = cursosList[i];
    const horario = horariosDatos[i] || horariosDatos[0];
    await connection.query(
      `INSERT IGNORE INTO horarios (curso_id, profesor_id, seccion_id, periodo_academico_id, dia_semana, hora_inicio, hora_fin, aula)
       VALUES (?, ?, ?, (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1), ?, ?, ?, ?)`,
      [curso.id, profesorId, 7, horario[0], horario[1], horario[2], horario[3]]
    );
  }

  // Matrículas
  for (const curso of cursosList) {
    await connection.query(
      'INSERT IGNORE INTO matriculas (alumno_id, curso_id, periodo_academico_id) VALUES (?, ?, (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1))',
      [alumnoIdNum, curso.id]
    );
  }

  // Calificaciones (promedio bajo para que la IA detecte riesgo)
  const notasMat = [9, 8];
  const notasCom = [11, 10];
  const notasResto = [12, 11];
  const fechaParcial1 = ['2026-04-10', '2026-04-10', '2026-04-10', '2026-04-10', '2026-04-10', '2026-04-10'];
  const fechaParcial2 = ['2026-05-15', '2026-05-15', '2026-05-15', '2026-05-15', '2026-05-15', '2026-05-15'];

  for (let i = 0; i < cursosList.length; i++) {
    const curso = cursosList[i];
    let notas: number[];
    if (curso.codigo === 'MAT-4') notas = notasMat;
    else if (curso.codigo === 'COM-4') notas = notasCom;
    else notas = notasResto;

    await connection.query(
      `INSERT INTO calificaciones (alumno_id, curso_id, periodo_academico_id, nota, tipo_evaluacion, fecha_evaluacion)
       VALUES (?, ?, (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1), ?, 'parcial', ?)`,
      [alumnoIdNum, curso.id, notas[0], fechaParcial1[i]]
    );
    await connection.query(
      `INSERT INTO calificaciones (alumno_id, curso_id, periodo_academico_id, nota, tipo_evaluacion, fecha_evaluacion)
       VALUES (?, ?, (SELECT id FROM periodos_academicos WHERE activo = 1 LIMIT 1), ?, 'parcial', ?)`,
      [alumnoIdNum, curso.id, notas[1], fechaParcial2[i]]
    );
  }

  // 6. Asistencias (con inasistencias y tardanzas)
  console.log('6. Creando registros de asistencia...');
  const estadosSemana = ['presente', 'ausente', 'presente', 'tardanza', 'ausente', 'presente', 'ausente', 'presente', 'tardanza', 'ausente'];

  for (let w = 0; w < 10; w++) {
    const fechaBase = new Date('2026-04-06');
    fechaBase.setDate(fechaBase.getDate() + w * 7);

    for (let d = 0; d < 5; d++) {
      const fecha = new Date(fechaBase);
      fecha.setDate(fecha.getDate() + d);
      const fechaStr = fecha.toISOString().split('T')[0];

      const estado = estadosSemana[w * 2 % estadosSemana.length];
      const minutos = estado === 'tardanza' ? 10 + (w * 5) : 0;

      await connection.query(
        `INSERT IGNORE INTO asistencias (alumno_id, fecha, estado, minutos_tardanza)
         VALUES (?, ?, ?, ?)`,
        [alumnoIdNum, fechaStr, estado, minutos]
      );
    }
  }

  // 7. Documentos de ejemplo
  console.log('7. Creando documentos de ejemplo...');
  await connection.query(
    `INSERT IGNORE INTO documentos (titulo, descripcion, archivo_url, tipo_archivo, categoria, alumno_id, usuario_subio, obligatorio, estado)
     VALUES ('DNI del Alumno', 'Copia del documento de identidad', '/uploads/dni_ejemplo.pdf', 'pdf', 'Personal', ?, ?, 1, 'pendiente'),
            ('Certificado de Estudios', 'Certificado del año anterior', '/uploads/certificado.pdf', 'pdf', 'Académico', ?, ?, 0, 'activo')`,
    [alumnoIdNum, userIds['admin@escuela.edu'], alumnoIdNum, userIds['admin@escuela.edu']]
  );

  console.log('\n=== SEED COMPLETADO ===');
  console.log('\nUsuarios creados:');
  console.log('  Admin:    admin@escuela.edu / admin123');
  console.log('  Profesor: profesor@escuela.edu / prof123');
  console.log('  Alumno:   alumno@escuela.edu / alu123');
  console.log('  Apoderado: apoderado@escuela.edu / apo123');

  await connection.end();
}

main().catch(err => {
  console.error('\nError durante el seed:', err.message);
  process.exit(1);
});