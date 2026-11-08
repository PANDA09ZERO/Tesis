// Crea la base de DEMOSTRACIÓN para las capturas del video: gestion_video_demo.
// Usa el mismo MySQL que backend/.env, pero OTRA base: no lee ni modifica la base real.
// Todos los datos son ficticios. Cuentas (solo existen en esta base):
//   admin@escuela.edu / admin123 · profesor@escuela.edu / prof123
//   alumno@escuela.edu / alu123  · apoderado@escuela.edu / apo123
// Uso (desde video-guia/):  node tools\demo\crear-base-demo.cjs
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const BACKEND = path.resolve(__dirname, '../../../backend');
const req = createRequire(path.join(BACKEND, 'package.json'));
req('dotenv').config({ path: path.join(BACKEND, '.env') });
const mysql = req('mysql2/promise');
const { encryptPassword } = req('./dist/utils/encrypt');

const DB = 'gestion_video_demo';
if (!/^gestion_video_demo$/.test(DB)) throw new Error('Nombre de base inesperado');

// ---------- utilidades ----------
let seed = 20261108;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = a => a[Math.floor(rnd() * a.length)];
const iso = d => d.toISOString().slice(0, 10);
const hoy = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date()) + 'T12:00:00Z');
const Y = hoy.getUTCFullYear();
const diasHabiles = (n) => { const out = []; const d = new Date(hoy); while (out.length < n) { d.setUTCDate(d.getUTCDate() - 1); const w = d.getUTCDay(); if (w > 0 && w < 6) out.push(iso(d)); } return out.reverse(); };

(async () => {
  const cfg = { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', charset: 'utf8mb4', dateStrings: true, multipleStatements: true };
  const root = await mysql.createConnection(cfg);
  await root.query(`DROP DATABASE IF EXISTS \`${DB}\``);
  await root.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await root.end();
  const db = await mysql.createConnection({ ...cfg, database: DB });

  // ---------- estructura: la misma de schema.sql ----------
  const schema = fs.readFileSync(path.resolve(BACKEND, '../database/schema.sql'), 'utf8').replace(/^﻿/, '')
    .replace(/^CREATE DATABASE[^;]+;\s*/m, '').replace(/^USE[^;]+;\s*/m, '');
  await db.query(schema);
  const q = (sql, args) => db.query(sql, args);
  const ins = async (sql, args) => (await q(sql, args))[0].insertId;

  // ---------- personas ----------
  const hash = p => encryptPassword(p);
  const [[{ id: R_ADMIN }]] = await q("SELECT id FROM roles WHERE nombre='administrador'");
  const [[{ id: R_PROF }]] = await q("SELECT id FROM roles WHERE nombre='profesor'");
  const [[{ id: R_ALU }]] = await q("SELECT id FROM roles WHERE nombre='alumno'");
  const [[{ id: R_APO }]] = await q("SELECT id FROM roles WHERE nombre='apoderado'");
  let dni = 70000000;
  const usuario = (email, pass, nombre, apellido, rol, genero) => ins(
    'INSERT INTO usuarios(email,password_hash,nombre,apellido,dni,telefono,rol_id,genero,fecha_nacimiento,ultimo_acceso) VALUES(?,?,?,?,?,?,?,?,?,NOW())',
    [email, hash(pass), nombre, apellido, String(dni++), '9' + String(10000000 + Math.floor(rnd() * 89999999)), rol, genero, rol === R_ALU ? `${Y - 7 - Math.floor(rnd() * 3)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}` : null]);
  const DOM = '@cienciaseingenieria.edu';
  const slug = (n, a) => (n + '.' + a.split(' ')[0]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const adminId = await usuario('admin@escuela.edu', 'admin123', 'Carlos', 'Mendoza Aguilar', R_ADMIN, 'M');
  const PROFES = [
    ['Valeria', 'Ríos Campos', 'F', 'Matemática', 'Licenciada en Educación Primaria', 'profesor@escuela.edu', 'prof123'],
    ['Jorge', 'Salazar Núñez', 'M', 'Comunicación', 'Licenciado en Educación'],
    ['Rosa', 'Delgado Pinto', 'F', 'Ciencia y Tecnología', 'Licenciada en Biología'],
    ['Miguel', 'Cárdenas Ruiz', 'M', 'Inglés', 'Licenciado en Idiomas'],
  ];
  const prof = [];
  for (const [n, a, g, esp, tit, email, pass] of PROFES) {
    const u = await usuario(email || slug(n, a) + DOM, pass || 'Demo-2026-video', n, a, R_PROF, g);
    prof.push({ u, id: await ins('INSERT INTO profesores(usuario_id,especialidad,titulo_profesional,fecha_ingreso) VALUES(?,?,?,?)', [u, esp, tit, `${Y - 3 - Math.floor(rnd() * 5)}-03-01`]), nombre: n });
  }

  // ---------- año escolar ----------
  const p1 = await ins('INSERT INTO periodos_academicos(nombre,fecha_inicio,fecha_fin,activo) VALUES(?,?,?,0)', [`${Y}-I`, `${Y}-03-02`, `${Y}-07-17`]);
  const p2 = await ins('INSERT INTO periodos_academicos(nombre,fecha_inicio,fecha_fin,activo) VALUES(?,?,?,1)', [`${Y}-II`, `${Y}-07-27`, `${Y}-12-18`]);
  const GRADOS = ['1er Grado', '2do Grado', '3er Grado'];
  const grados = [];
  for (const [i, g] of GRADOS.entries()) grados.push(await ins("INSERT INTO grados(nombre,nivel,orden) VALUES(?,'Primaria',?)", [g, i + 1]));
  const CURSOS = [['Matemáticas', 'MAT', 0], ['Comunicación', 'COM', 1], ['Ciencia y Tecnología', 'CYT', 2], ['Personal Social', 'PS', 2], ['Inglés', 'ING', 3]];
  const cursos = {}; // [gradoIdx][k] = id
  for (const [gi, g] of grados.entries()) {
    cursos[gi] = [];
    for (const [nombre, cod] of CURSOS) cursos[gi].push(await ins('INSERT INTO cursos(nombre,codigo,descripcion,grado_id) VALUES(?,?,?,?)', [nombre, `${cod}-${gi + 1}`, `${nombre} para ${GRADOS[gi]} de primaria.`, g]));
  }
  const oferta = {}; // `${p}-${gi}-${k}` = pgc id
  for (const p of [p1, p2]) for (const [gi, g] of grados.entries()) {
    await q('INSERT INTO periodo_grados(periodo_academico_id,grado_id) VALUES(?,?)', [p, g]);
    for (const [k, [, , pi]] of CURSOS.entries()) {
      const id = await ins('INSERT INTO periodo_grado_cursos(periodo_academico_id,grado_id,curso_id) VALUES(?,?,?)', [p, g, cursos[gi][k]]);
      oferta[`${p}-${gi}-${k}`] = { id, prof: prof[pi], curso: cursos[gi][k], g };
      await q('INSERT INTO periodo_grado_curso_profesores(periodo_grado_curso_id,profesor_id) VALUES(?,?)', [id, prof[pi].id]);
    }
  }
  // horarios del periodo vigente: cada curso 2 bloques; sin cruces por grado ni por docente
  const DIAS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
  const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
  for (const [gi] of grados.entries()) for (const [k] of CURSOS.entries()) for (const b of [0, 1]) {
    const o = oferta[`${p2}-${gi}-${k}`]; const dia = DIAS[(k + b * 2) % 5]; const slot = gi * 2 + b; const ini = 7 * 60 + 45 + slot * 50;
    await q('INSERT INTO horarios(curso_id,profesor_id,periodo_academico_id,periodo_grado_curso_id,dia_semana,hora_inicio,hora_fin,aula) VALUES(?,?,?,?,?,?,?,?)',
      [o.curso, o.prof.id, p2, o.id, dia, hhmm(ini), hhmm(ini + 45), `${gi + 1}${'AB'[b]}`]);
  }

  // ---------- alumnos y apoderados ----------
  const NOMBRES = [['Andrés', 'Ibarra Montes', 'M'], ['Lucía', 'Mendoza Silva', 'F'], ['Mateo', 'Quispe Rojas', 'M'], ['Camila', 'Flores Vega', 'F'], ['Diego', 'Huamán Paredes', 'M'], ['Valentina', 'Castro León', 'F'], ['Sebastián', 'Torres Lima', 'M'], ['Daniela', 'Chávez Ortiz', 'F'],
    ['Thiago', 'Ramos Benítez', 'M'], ['Sofía', 'Gutiérrez Sosa', 'F'], ['Gael', 'Vargas Pinedo', 'M'], ['Isabella', 'Soto Medina', 'F'], ['Joaquín', 'Herrera Ríos', 'M'], ['Ariana', 'Cruz Navarro', 'F'], ['Leonardo', 'Morales Díaz', 'M'], ['Mía', 'Rojas Cáceres', 'F'],
    ['Santiago', 'Paredes Luna', 'M'], ['Emma', 'Salinas Pérez', 'F'], ['Adrián', 'Núñez Vera', 'M'], ['Luciana', 'Campos Aguirre', 'F'], ['Fabricio', 'Molina Tapia', 'M'], ['Renata', 'Ortega Valdez', 'F'], ['Bruno', 'Espinoza Reyes', 'M'], ['Zoe', 'Lozano Arias', 'F']];
  const alumnos = [];
  for (const [i, [n, a, g]] of NOMBRES.entries()) {
    const gi = Math.floor(i / 8);
    const u = await usuario(i === 0 ? 'alumno@escuela.edu' : slug(n, a) + DOM, i === 0 ? 'alu123' : 'Demo-2026-video', n, a, R_ALU, g);
    const id = await ins("INSERT INTO alumnos(usuario_id,codigo_alumno,grado_id,periodo_academico_id,estado) VALUES(?,?,?,?,'matriculado')", [u, `ALU-${Y}-${String(i + 1).padStart(3, '0')}`, grados[gi], p2]);
    alumnos.push({ id, u, gi, n, a });
  }
  const APOS = [['Patricia', 'Montes Vargas', 'F', 'Contadora', [0, 8], 'Madre', 'apoderado@escuela.edu', 'apo123'], ['Ricardo', 'Mendoza Torres', 'M', 'Ingeniero', [1], 'Padre'], ['Elena', 'Rojas Quispe', 'F', 'Enfermera', [2], 'Madre'],
    ['Luis', 'Flores Campos', 'M', 'Comerciante', [3], 'Padre'], ['Carmen', 'Paredes Soto', 'F', 'Docente', [4, 16], 'Madre'], ['Óscar', 'León Castro', 'M', 'Abogado', [5], 'Padre']];
  for (const [n, a, g, ocup, hijos, par, email, pass] of APOS) {
    const u = await usuario(email || slug(n, a) + DOM, pass || 'Demo-2026-video', n, a, R_APO, g);
    const ap = await ins('INSERT INTO apoderados(usuario_id,ocupacion) VALUES(?,?)', [u, ocup]);
    for (const h of hijos) await q('INSERT INTO apoderado_alumno(apoderado_id,alumno_id,parentesco) VALUES(?,?,?)', [ap, alumnos[h].id, par]);
  }

  // ---------- matrículas, evaluaciones, notas y asistencia ----------
  const nivel = alumnos.map((_, i) => i === 2 ? 0.35 : i === 3 ? 0.6 : 0.55 + rnd() * 0.4); // Mateo con notas bajas
  for (const p of [p1, p2]) for (const al of alumnos) for (const [k] of CURSOS.entries()) {
    await q("INSERT INTO matriculas(alumno_id,curso_id,periodo_academico_id,grado_id,estado,fecha_matricula) VALUES(?,?,?,?,'activa',?)", [al.id, cursos[al.gi][k], p, grados[al.gi], p === p1 ? `${Y}-02-20 09:00:00` : `${Y}-07-20 09:00:00`]);
  }
  const EVALS = { [p1]: [['Examen final', 'final', `${Y}-07-08`]], [p2]: [['Práctica 1', 'practica', `${Y}-09-15`], ['Examen parcial', 'parcial', `${Y}-10-09`], ['Práctica 2', 'practica', `${Y}-10-30`], ['Tarea integradora', 'tarea', `${Y}-11-20`]] };
  for (const p of [p1, p2]) for (const [gi] of grados.entries()) for (const [k] of CURSOS.entries()) {
    const o = oferta[`${p}-${gi}-${k}`];
    for (const [nombre, tipo, fecha] of EVALS[p]) {
      const ev = await ins('INSERT INTO evaluaciones(periodo_grado_curso_id,nombre,tipo,fecha_evaluacion,nota_maxima,estado,creado_por_usuario_id) VALUES(?,?,?,?,20,?,?)', [o.id, nombre, tipo, fecha, p === p1 ? 'cerrada' : 'activa', o.prof.u]);
      if (fecha > iso(hoy)) continue; // evaluación futura: aún sin notas
      for (const [ai, al] of alumnos.entries()) if (al.gi === gi) {
        const nota = Math.max(5, Math.min(20, Math.round((nivel[ai] * 20 + (rnd() - 0.5) * 5) * 2) / 2));
        await q('INSERT INTO calificaciones(alumno_id,curso_id,periodo_academico_id,periodo_grado_curso_id,evaluacion_id,nota,tipo_evaluacion,registrado_por,fecha_evaluacion) VALUES(?,?,?,?,?,?,?,?,?)',
          [al.id, o.curso, p, o.id, ev, nota, tipo, o.prof.id, fecha]);
      }
    }
  }
  const dias = diasHabiles(20);
  for (const [ai, al] of alumnos.entries()) for (const [k] of CURSOS.entries()) {
    const o = oferta[`${p2}-${al.gi}-${k}`];
    for (const f of dias) {
      if (!DIAS.includes(DIAS[(new Date(f + 'T12:00:00Z').getUTCDay() + 6) % 7])) continue;
      const r = rnd();
      let estado = r < 0.88 ? 'presente' : r < 0.94 ? 'tardanza' : r < 0.98 ? 'ausente' : 'justificado';
      if (ai === 2 && dias.indexOf(f) % 4 === 0) estado = 'ausente';   // Mateo: faltas frecuentes
      if (ai === 3 && dias.indexOf(f) % 6 === 0) estado = 'tardanza';  // Camila: tardanzas
      await q('INSERT INTO asistencias(alumno_id,curso_id,periodo_grado_curso_id,fecha,estado,minutos_tardanza,registrado_por) VALUES(?,?,?,?,?,?,?)',
        [al.id, o.curso, o.id, f, estado, estado === 'tardanza' ? 5 + Math.floor(rnd() * 15) : 0, o.prof.id]);
    }
  }

  // ---------- pagos ----------
  const MESES = ['Agosto', 'Septiembre', 'Octubre', 'Noviembre'];
  for (const [ai, al] of alumnos.entries()) {
    const debe = ai % 7 === 3;
    await q('INSERT INTO pagos_matricula(alumno_id,periodo_academico_id,monto,estado,fecha_pago) VALUES(?,?,?,?,?)', [al.id, p2, 300, debe ? 'pendiente' : 'pagado', debe ? null : `${Y}-07-21`]);
    for (const [mi, mes] of MESES.entries()) {
      const pagado = mi < 3 ? !(debe && mi === 2) : rnd() < 0.55;
      await q('INSERT INTO mensualidades(alumno_id,periodo_academico_id,monto,mes,año,estado,fecha_pago,metodo_pago,registrado_por) VALUES(?,?,?,?,?,?,?,?,?)',
        [al.id, p2, 350, mes, Y, pagado ? 'pagado' : mi < 3 ? 'vencido' : 'pendiente', pagado ? `${Y}-${String(8 + mi).padStart(2, '0')}-05` : null, pagado ? pick(['Efectivo', 'Transferencia', 'Yape']) : null, adminId]);
    }
  }
  for (const pr of prof) for (const [mi, mes] of ['Septiembre', 'Octubre', 'Noviembre'].entries())
    await q('INSERT INTO sueldos(profesor_id,periodo_academico_id,salario_base,horas_clase,monto_extra,monto_total,mes,año,estado,fecha_pago,registrado_por) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [pr.id, p2, 2400, 96, mi === 1 ? 150 : 0, mi === 1 ? 2550 : 2400, mes, Y, mi < 2 ? 'pagado' : 'pendiente', mi < 2 ? `${Y}-${String(9 + mi).padStart(2, '0')}-30` : null, adminId]);

  // ---------- documentos, formularios, calendario y avisos ----------
  const cats = {};
  for (const c of ['Constancias', 'Fichas médicas', 'Comunicados']) cats[c] = await ins('INSERT INTO documento_categorias(nombre,nombre_normalizado,creado_por) VALUES(?,?,?)', [c, c.toLowerCase(), adminId]);
  for (const [t, c, al, tipo] of [['Constancia de matrícula', 'Constancias', 0, 'pdf'], ['Ficha médica', 'Fichas médicas', 0, 'pdf'], ['Constancia de matrícula', 'Constancias', 1, 'pdf'], ['Ficha médica', 'Fichas médicas', 2, 'imagen'], ['Reglamento interno ' + Y, 'Comunicados', null, 'pdf'], ['Calendario escolar ' + Y, 'Comunicados', null, 'documento']])
    await q('INSERT INTO documentos(titulo,tipo_archivo,tamano_bytes,categoria,categoria_id,alumno_id,usuario_subio,estado) VALUES(?,?,?,?,?,?,?,?)', [t, tipo, 180000 + Math.floor(rnd() * 400000), c, cats[c], al === null ? null : alumnos[al].id, adminId, 'activo']);
  await q("INSERT INTO formularios_documentales(titulo,descripcion,categoria_id,campos,estado,creado_por) VALUES(?,?,?,?,'publicada',?)",
    ['Autorización de salida de campo', 'Permiso del apoderado para la visita al museo.', cats['Comunicados'], JSON.stringify([{ id: 'nombre', etiqueta: 'Nombre del apoderado', tipo: 'texto', requerido: true }, { id: 'autoriza', etiqueta: '¿Autoriza la salida?', tipo: 'texto', requerido: true }]), adminId]);
  const ev = (d, t, desc, tipo, hi, hf) => q('INSERT INTO eventos_calendario(titulo,descripcion,fecha,hora_inicio,hora_fin,tipo,periodo_academico_id,creado_por_usuario_id) VALUES(?,?,?,?,?,?,?,?)', [t, desc, d, hi, hf, tipo, p2, adminId]);
  const dd = n => { const d = new Date(hoy); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  await ev(dd(3), 'Reunión de padres de familia', 'Entrega de avances del bimestre.', 'reunion', '18:00:00', '19:30:00');
  await ev(dd(9), 'Día del Logro', 'Presentación de proyectos de los alumnos.', 'institucional', '09:00:00', '12:00:00');
  await ev(`${Y}-12-08`, 'Inmaculada Concepción', 'Feriado nacional.', 'feriado', null, null);
  await ev(dd(-4), 'Simulacro de sismo', 'Simulacro nacional multipeligro.', 'institucional', '10:00:00', '10:30:00');
  const aviso = (u, t, m, tipo, pr, leida) => q('INSERT INTO notificaciones(titulo,mensaje,tipo,usuario_id,prioridad,leida) VALUES(?,?,?,?,?,?)', [t, m, tipo, u, pr, leida]);
  for (const pr of prof) { await aviso(pr.u, 'Registro de notas', 'Recuerda registrar las notas del examen parcial antes del viernes.', 'info', 'alta', 0); await aviso(pr.u, 'Reunión de docentes', 'El lunes a las 3:30 p. m. en la sala de profesores.', 'info', 'normal', 1); }
  const AVISOS_ALU = [['Día del Logro', 'Prepara tu proyecto para la presentación.', 'info', 'normal'], ['Pago de noviembre', 'La mensualidad de noviembre vence el día 10.', 'warning', 'alta'], ['Salida al museo', 'Entrega la autorización firmada hasta el jueves.', 'info', 'normal'], ['Reunión de padres', 'Recuerda a tu apoderado la reunión del viernes.', 'info', 'normal']];
  for (const [k, al] of alumnos.slice(0, 4).entries()) { const [t, m, tipo, pr] = AVISOS_ALU[k]; await aviso(al.u, t, m, tipo, pr, 0); }

  // ---------- seguimiento: alertas, incidencias y actividad ----------
  const alerta = (al, tipo, nivelR, items, desc, rec, estado) => q('INSERT INTO alertas_academicas(alumno_id,tipo_riesgo,nivel_riesgo,indicadores,descripcion,recomendacion,estado,generada_por_ia) VALUES(?,?,?,?,?,?,?,0)',
    [alumnos[al].id, tipo, nivelR, JSON.stringify({ periodo_id: p2, items }), desc, rec, estado]);
  await alerta(2, 'alto', 95, [{ tipo: 'faltas', riesgo: 'alto', valor: 5, detalle: '' }, { tipo: 'notas', riesgo: 'medio', valor: 1, detalle: '' }], '5 días con faltas sin justificar en los últimos 30 días. Promedio desaprobatorio en Matemáticas.', 'Citar al apoderado a una reunión.', 'activa');
  await alerta(3, 'medio', 50, [{ tipo: 'tardanzas', riesgo: 'bajo', valor: 3, detalle: '' }, { tipo: 'conducta', riesgo: 'medio', valor: 2, detalle: '' }], '3 días con tardanza. 2 incidencias de conducta.', 'Revisar las incidencias registradas con tutoría.', 'activa');
  await alerta(4, 'bajo', 15, [{ tipo: 'tardanzas', riesgo: 'bajo', valor: 3, detalle: '' }], '3 días con tardanza en los últimos 30 días.', 'Verificar con el apoderado el motivo de las tardanzas.', 'atendida');
  const inc = (al, d, tipo, grav, lugar, desc, medida, estado, resol) => q('INSERT INTO incidencias(alumno_id,periodo_academico_id,reportado_por,fecha,tipo,gravedad,lugar,descripcion,medida_tomada,apoderado_notificado,estado,resolucion,cerrada_por,cerrada_en) VALUES(?,?,?,?,?,?,?,?,?,1,?,?,?,?)',
    [alumnos[al].id, p2, prof[0].u, d, tipo, grav, lugar, desc, medida, estado, resol, resol ? adminId : null, resol ? `${d} 16:00:00` : null]);
  await inc(0, dd(-6), 'conducta', 'leve', 'Patio', 'Uso del celular durante la formación.', 'Llamada de atención verbal.', 'cerrada', 'Se conversó con el alumno y no volvió a ocurrir.');
  await inc(3, dd(-2), 'derivacion_direccion', 'moderada', 'Aula 1B', 'Discutió con un compañero durante la clase y fue derivada a dirección.', 'Conversación con dirección y citación al apoderado.', 'abierta', null);
  for (const [u, acc, ent] of [[adminId, 'login', 'usuarios'], [prof[0].u, 'login', 'usuarios'], [adminId, 'crear_incidencia', 'incidencias'], [adminId, 'evaluar_alertas', 'alertas'], [prof[1].u, 'login', 'usuarios']])
    await q('INSERT INTO registro_actividades(usuario_id,accion,entidad,detalles) VALUES(?,?,?,?)', [u, acc, ent, JSON.stringify({ demo: true })]);

  // la herramienta de capturas usa este curso para las pantallas del profesor
  fs.writeFileSync(path.join(__dirname, 'demo-ids.json'), JSON.stringify({ oferta: oferta[`${p2}-0-0`].id, alumno: alumnos[0].id }));
  const [[c]] = await q('SELECT (SELECT COUNT(*) FROM usuarios) usuarios,(SELECT COUNT(*) FROM alumnos) alumnos,(SELECT COUNT(*) FROM calificaciones) notas,(SELECT COUNT(*) FROM asistencias) asistencias');
  console.log(`Base ${DB} lista:`, JSON.stringify(c));
  await db.end();
})().catch(e => { console.error('No se pudo crear la base de demostración:', e.message); process.exitCode = 1; });
