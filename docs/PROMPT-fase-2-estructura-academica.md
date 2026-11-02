# PROMPT — Fase 2: Estructura Académica (clonado de periodos, visibilidad por grado y matrícula masiva)

> Copia todo este texto en una sesión nueva del agente (modo Act). Es autocontenido.

## 0. Contexto del proyecto

Eres un agente de código trabajando en un **Sistema Inteligente de Gestión Educativa** (tesis) en `C:\xampp\htdocs\Tesis` (rama `main`; el repo tiene cambios sin commitear — **NO hagas commit ni push**).

**Stack y puertos:**
- Backend: Node.js + Express + TypeScript + mysql2, puerto **3000**. Arranque: `cd C:\xampp\htdocs\Tesis\backend; npm run dev` (usa `ts-node-dev --respawn`, espera unos segundos tras editar archivos).
- Frontend: React + TypeScript + Vite + Tailwind, puerto **5173**. El proxy `/api` apunta a `http://localhost:3000`.
- MySQL 8 en `127.0.0.1:3307`, usuario `root`, password `GodOfWar2003.`, BD `gestion_educativa`.
- Servicio IA (opcional, no lo necesitas para esta tarea).

**Verifica que backend + MySQL + frontend estén corriendo antes de probar.**

**Reglas del shell (PowerShell, Windows):**
- Inicia tus comandos con `$ErrorActionPreference='Continue'`.
- Para MySQL usa `$env:MYSQL_PWD='GodOfWar2003.'` y luego `& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe' -h 127.0.0.1 -P 3307 -u root gestion_educativa -e "..."`. Esto evita que la advertencia de contraseña aborte la secuencia.
- Comandos no interactivos y citas compatibles con PowerShell.

**Convenciones del código (respétalas):**
- Backend: respuestas con `sendSuccess`/`sendError` (`backend/src/utils/response.ts`), pool `mysql2/promise` (`src/config/database.ts`), transacciones donde aplique, rutas con `authenticate` + `authorize('administrador', ...)` según el caso.
- Frontend: cliente `axios` (`frontend/src/api/client.ts`, `baseURL: '/api'`), funciones por módulo en `frontend/src/api/endpoints.ts`, componentes `Modal`, `ConfirmDialog`, `DataTable`, `StatCard`, `Badge`, `react-hot-toast`. Estilo de clases Tailwind ya usado (`card`, `btn-primary`, `btn-secondary`, `input-field`).

**Usuarios de prueba (login en http://localhost:5173):**
- admin: `admin@escuela.edu` / `admin123`
- profesor: `profesor@escuela.edu` / `prof123`
- alumno: `alumno@escuela.edu` / `alu123`
- apoderado: `apoderado@escuela.edu` / `apo123`

## 1. Estado actual (punto de partida — verifícalo, NO lo rehagas)

La **Fase 1 ya está implementada**. Confirma que este estado existe antes de continuar:

**Tablas nuevas** (`database/migrations/create_estructura_academica.sql`):
- `periodo_grados (periodo_academico_id, grado_id)` — grados habilitados por periodo. UNIQUE(periodo, grado).
- `periodo_grado_cursos (periodo_academico_id, grado_id, curso_id)` — cursos de cada grado por periodo. UNIQUE(periodo, grado, curso).
- `periodo_grado_curso_profesores (periodo_grado_curso_id, profesor_id)` — varios profesores por (periodo, grado, curso). UNIQUE.
- `profesor_curso.origen ENUM('manual','configuracion')` — distingue asignaciones manuales (desde Profesores) de las generadas por la configuración.

**Backend** (`backend/src/controllers/configuracion.controller.ts`, `backend/src/routes/configuracion.routes.ts`, registrado en `app.ts` como `/api/configuracion-academica`):
- `GET /periodos/:periodoId` → `{ grados: [{ grado_id, grado, nivel, cursos: [{ id, curso_id, curso, codigo, profesores: [...] }] }], resumen: { grados, cursos, asignaciones } }` (roles: administrador, profesor).
- `GET /periodos/:periodoId/grados/:gradoId/cursos` → cursos del grado con sus profesores.
- `POST /periodos/:periodoId/grados {grado_ids|grado_id}`, `DELETE /periodos/:periodoId/grados/:gradoId`.
- `POST /periodos/:periodoId/grados/:gradoId/cursos {curso_ids|curso_id}`, `DELETE /cursos/:pgcId`.
- `POST /cursos/:pgcId/profesores {profesor_ids|profesor_id}`, `DELETE /cursos/:pgcId/profesores/:profesorId`.
- Cada mutación ejecuta `syncProfesorCurso()`: borra filas `origen='configuracion'` y las reconstruye con `INSERT IGNORE ... SELECT DISTINCT ...` (las manuales se respetan).

**Matrícula automática** (`backend/src/controllers/matriculas.controller.ts` → `createMatricula`): acepta `curso_id` (opcional) y `auto_cursos` (por defecto true). Si no se indica curso y el grado tiene cursos configurados, crea **una matrícula por curso** (omite las ya activas, reactiva canceladas/completadas). Duplicados → 409 con mensaje específico. `PUT /matriculas/:id` acepta `curso_id`. `GET /matriculas` devuelve `curso` y acepta filtro `?curso_id=`.

**Frontend:** página `ConfiguracionAcademicaPage` (ruta `/admin/configuracion-academica`, item "Estructura Académica" en el sidebar, solo admin), `CursoDetailPage` con tarjeta "Alumnos del curso" + modal Asignar + Quitar, `MatriculasPage` con selector "Curso (opcional)" + checkbox "Inscribir automáticamente los cursos del grado" con previsualización. `configuracionApi` en `endpoints.ts`.

**Datos de referencia:** periodos `1 = 2026-I (activo)`, `2 = 2025-II`. Grados: `19-21` Inicial, `22-27` Primaria (22=1er … 26=5to, 27=6to), `28-32` Secundaria. Cursos reales: `1 Matemáticas, 2 COMUNICACIÓN IV, 3 CIENCIA Y TECNOLOGÍA, 4 HISTORIA IV, 5 Inglés, 6 Arte, 7 EDUCACIÓN FÍSICA IV` (8 "prueba" y 9 "pruebita" son basura de pruebas). Profesores: `1 cristianvasquez0902@gmail.com, 2 Josias@edu.com, 3 Ari@edu.com, 4 profesor@escuela.edu`. Alumnos: `1 ALU-MU26JPUS (grado 32)`, `2 ALU-2026-001`. Matrículas: 7 filas (alumno 2 en cursos 1–7, periodo 1).

## 2. Lo que hay que construir (Fase 2 — todo con admin salvo que se indique)

### A) Clonar configuración de un periodo anterior (plantilla)
**Motivo:** no repetir a mano grados/cursos/profesores cada año.
- Backend `POST /api/configuracion-academica/periodos/:destinoId/clonar { periodo_origen_id }` (solo admin).
  - Lee todos los `(periodo_origen, grado, curso, profesor)` y los inserta con `INSERT IGNORE` en el periodo destino (mismos grados, mismos cursos, **mismos profesores primero**: reusa `profesor.id` si existe; si el profesor ya no existe, omite ese profesor pero conserva el curso configurado).
  - Ejecuta `syncProfesorCurso()` al final.
  - Devuelve resumen `{ grados: n, cursos: n, profesores_asignados: n, profesores_omitidos: [ids] }`.
- Frontend: en `ConfiguracionAcademicaPage`, botón **"Clonar de otro periodo"** junto al selector de periodo que abre un `Modal` con un select del periodo origen (excluir el destino) + botón confirmar con `window.confirm` indicando cuántos elementos se copiarán. Recargar la estructura al terminar.
- **Reglas:** solo el admin. Si el destino ya tiene cursos de ese grado, se fusionan (no se borra nada). `profesor_curso` manual no se toca (el sync ya lo garantiza).

### B) Visibilidad del profesor limitada a SU (grado, curso) — ya no solo por curso
**Motivo:** hoy un profesor que dicta "Comunicación 5.º" ve también los alumnos/notas/asistencias de "Comunicación 6.º", porque `profesor_curso` es solo por curso.
- Mantén `profesor_curso` + `origen` como están (no los borres).
- En los filtros de rol `profesor` de estos endpoints, exige además que el **grado** del vínculo coincida con el grado del recurso consultado. Casos:
  1. `cursos.controller getAllCursos` / `getCursoById`: solo cursos de la config donde el profesor esté asignado en **ese (periodo, grado, curso)**, más lo manual (OR con `profesor_curso`).
  2. `alumnos.controller getAllAlumnos` / `getAlumnoById` / `getAlumnoHorario`: alumnos matriculados (`matriculas.estado='activa'`) en (periodo, grado, curso) dictados por él, más lo manual ya existente.
  3. `calificaciones.controller`: `getAlumnosByCurso`, `getCalificacionesByCurso`, `getCalificacionesByAlumno`, validaciones de `registerCalificacion`/`bulkRegisterCalificaciones` (fallar 403 si el alumno no está en un (grado, curso) del profesor en el periodo de la evaluación).
  4. `asistencias.controller`: `getAsistenciasByCurso`, validaciones de `registerAsistencia`/`bulkRegisterAsistencias`, `getResumenAsistenciaGrado`.
  5. `alertas.controller`: los 3 filtros de profesor que usan `profesor_curso`.
  6. `middleware/linkedAlumno.ts` (`authorizeLinkedAlumno` para profesor): usa (periodo, grado, curso) de la config con respaldo a `profesor_curso`.
  7. `dashboard.controller` (endpoints que el profesor consulta) y `reportes.controller` (rutas de profesor): si filtran por `profesor_curso`, aplicar el mismo criterio.
  8. `horarios.controller`: los horarios del profesor deben salir solo de sus (periodo, grado, curso) configurados.
- **Cómo:** introduce una función reutilizable, p. ej. `backend/src/utils/profesorAlcance.ts`, con algo como `profesorCursoScope({ cursoAlias, gradoAlias, periodoAlias?, userIdParam })` que devuelva `{ sql, params }`.
  Criterio: `(EXISTS config(periodo,grado,curso del recurso)) OR (EXISTS profesor_curso manual del curso)`.
  Ojo: "config" solo cuenta asignaciones del periodo pertinente; cuando el recurso lleve `periodo_academico_id`, filtra por ese periodo; si no lo lleva, usa el periodo activo.
- **Seguridad:** un profesor NUNCA debe ver ni calificar alumnos/cursos fuera de su asignación (403/404 según el controlador). Los manuales (`origen='manual'`) siguen otorgando acceso por curso como hoy.

### C) Asignación masiva de alumnos a un curso (desde el detalle del curso)
- Frontend `CursoDetailPage`: en la tarjeta "Alumnos del curso", junto a "Asignar", botón **"Asignar varios"** que abre un `Modal` con lista de alumnos (checkbox, todos menos los ya asignados en `alumnos`), campos de periodo, y al guardar llama a `POST /api/matriculas` **uno por uno** (reutiliza los mensajes 409: informa "N asignados, M ya estaban"). Refresca la lista al terminar (`refreshAlumnos` ya existe).
- No requiere cambios de backend salvo que detectes que falta algo; documenta qué reutilizaste.

### D) Tarjeta "Cursos" en el detalle del alumno (camino inverso)
- Frontend `AlumnoDetailPage`: nueva tarjeta/card "Cursos matriculados" que liste las matrículas con curso del alumno (usa `matriculasApi.getAll({ alumno_id, limit: 100 })` — ya acepta ese filtro) mostrando curso, periodo, estado y botón "Quitar" (admin, `ConfirmDialog` + `matriculasApi.delete`), más botón "Matricular en curso" (admin) que abra un `Modal` con selects de curso + periodo y llame a `matriculasApi.create({ alumno_id, curso_id, periodo_academico_id, grado_id? })`. Refrescar la tarjeta al terminar.
- El `grado_id` del formulario debe prellenarse con el grado del alumno si lo tiene; si el curso tiene grado en la config, el backend ya lo deriva.

## 3. Matriz de pruebas obligatoria (ejecútala contra los puertos reales)

Prepara los datos de prueba usando un periodo de prueba o el periodo 1 (no dejes basura: borra config y matrículas que crees, y restaura `alumnos` que toques):
1. **Clonado:** configurar periodo 2 (2025-II) con 2 grados + 3 cursos + 2 profesores → clonar a un periodo nuevo de prueba (créalo y luego elimínalo, o compara de vuelta y verifica igualdad) → verificar `GET estructura` del destino = origen (mismos cursos por grado y profesores; profesores inexistentes omitidos). Borrar el periodo de prueba al final.
2. **Visibilidad por grado:** configurar el MISMO curso (p. ej. Comunicación, id 2) en 5.º Primaria (grado 26) con profesor A y en 6.º Primaria (grado 27) con profesor B; matricular un alumno en 5.º y otro en 6.º (periodo activo).
   - `/api/cursos?limit=100` con profesor A → contiene el curso; con un profesor sin asignación → no lo contiene.
   - `/api/calificaciones/curso/2/alumnos` con profesor A → **solo** el alumno de 5.º; con profesor B → solo el de 6.º.
   - `POST /api/calificaciones/bulk` de profesor A con el alumno de 6.º → **403**.
   - `POST /api/asistencias/bulk` de profesor B con el alumno de 5.º → **403**.
   - `/api/alumnos/2` con profesor sin asignación → 404.
   - Verificar que las asignaciones **manuales** (`profesor_curso.origen='manual'`, p. ej. profesor 4 cursos 1–7) siguen otorgando acceso como hoy.
   - Admin ve todo (9 cursos, 2 alumnos) sin cambios.
3. **Asignación masiva + detalle alumno:** asignar 2 alumnos al curso 8 desde el modal masivo → ambos aparecen en `GET /api/cursos/8` y en sus tarjetas de alumno → quitar uno → desaparece. Borrar al final las matrículas creadas.
4. **Compilación:** `npx tsc --noEmit` en backend y frontend → EXIT=0; y pedir a Vite los módulos editados (`http://localhost:5173/src/pages/...`) esperando 200 sin "Transform failed".

## 4. Qué entregar al final

- Cambios de código mínimos y coherentes con los patrones del repo (ver §0); **NO** borres comentarios/documentación existentes salvo que queden obsoletos.
- Actualiza `backend/src/routes/seed.routes.ts` si el clonado deja obsoleta alguna lógica (y `database/schema.sql` solo si cambia la estructura).
- Deja la BD como estaba (limpia config/matriculas de prueba, restaura `alumnos` que toques).
- Resumen final en español con: qué archivos cambiaste, cómo funciona el clonado, cómo funciona el criterio de visibilidad (con ejemplo Comunicación 5.º vs 6.º), cómo usar la asignación masiva y la tarjeta de cursos del alumno, evidencia de las pruebas (salidas reales resumidas) y qué quedó pendiente si algo no pudiste cerrar.
