# Prompt: Matrículas y alumnos por periodo académico + rematricular alumnos de periodos anteriores

## Propósito

Permitir que la gestión de **matrículas** y **alumnos** se consulte y analice **seleccionando un periodo académico**, del mismo modo que ya se hace en otras secciones (Pagos, Horarios, Detalle del periodo). Además, habilitar la **rematrícula de alumnos registrados en periodos anteriores** hacia el periodo vigente o seleccionado, reutilizando la lógica existente de creación de matrículas.

No hagas commit ni push. El repositorio puede tener cambios previos sin commitear: inspecciónalos y trabaja con ellos. No reviertas ni sobrescribas cambios ajenos a esta tarea.

## Diagnóstico conocido: verifica antes de cambiar

- `database/schema.sql` define `matriculas` con `alumno_id`, `curso_id` (nullable), `periodo_academico_id`, `grado_id`, `estado` y `UNIQUE(alumno_id, curso_id, periodo_academico_id)`. Una matrícula de grado se materializa como una fila por cada curso configurado en `periodo_grado_cursos` para ese (periodo, grado).
- `alumnos` es **global**: `grado_id`, `periodo_academico_id` y `Estado` son solo cachés denormalizadas actualizadas por la matrícula. La identidad académica por periodo vive en `matriculas` (ver `docs/estudiantes.md`). No trates a un alumno como propiedad de un periodo.
- `backend/src/controllers/matriculas.controller.ts`:
  - `getAllMatriculas` ya acepta `periodo_id` (además de `alumno_id`, `curso_id`, `estado`) con paginación.
  - `getEstadisticasMatricula` ya acepta `?periodo_id=`.
  - `createMatricula` (líneas ~90-237) valida la oferta del periodo (`periodo_grado_cursos`), auto-inscribe en todos los cursos del grado (`auto_cursos`), reactiva matrículas `cancelada`/`completada` y rechaza duplicados activos; actualiza la caché del alumno.
- `backend/src/controllers/alumnos.controller.ts` (`getAllAlumnos`) solo filtra por `search` y `grado_id` para administrador; el filtro `periodo_id` existe pero solo se usa para acotar la visibilidad del profesor.
- `frontend/src/pages/admin/MatriculasPage.tsx` lista matrículas con `matriculasApi.getAll({page, limit:20})` **sin filtro de periodo**; las estadísticas tampoco se recargan por periodo.
- `frontend/src/pages/students/AlumnosPage.tsx` solo tiene `SearchInput`; no hay selector de periodo pese a que el backend podría soportarlo.
- Ya existe un patrón de selector de periodo muy consistente: `PagosPage.tsx` (barra de filtros con "Todos los periodos académicos"), `HorariosPage.tsx`, `CursosPage.tsx`, `CalendarPage.tsx`, con `periodosApi.getAll()`, periodo activo por defecto y etiqueta `{p.nombre}{p.activo ? ' · Activo' : ' · Histórico'}`.
- `frontend/src/pages/academics/PeriodoDetailPage.tsx` ya muestra matrículas de un periodo (`GET /api/matriculas?periodo_id=`) — referencia de comportamiento y campos útiles.
- `backend/src/controllers/configuracion.controller.ts` (`clonarConfiguracionPeriodo`) es el precedente de operación masiva por periodo (transacción + `INSERT ... SELECT`). La estructura del periodo destino debe existir (`periodo_grados`, `periodo_grado_cursos`) antes de poder matricular; `createMatricula` rechaza cursos no ofrecidos.
- Los pagos (`pagos_matricula`, `mensualidades`) son registros **por periodo**; no deben asumirse ni migrarse automáticamente en la rematrícula.

## Instrucciones iniciales

1. Lee `docs/estudiantes.md`, `docs/periodos-vigencia.md`, `docs/detalle-periodos.md` y `docs/asignaciones-academicas.md` antes de tocar código.
2. Revisa `git status` e inspecciona controladores, rutas, `frontend/src/api/endpoints.ts`, tipos, `MatriculasPage.tsx`, `AlumnosPage.tsx`, `PeriodoDetailPage.tsx` y el middleware de autorización.
3. Traza el flujo React → Axios → Express → SQL para listados y creación de matrículas. Distingue lo que ya funciona de lo que falta.
4. Presenta una hipótesis local comprobable y una prueba pequeña antes de la primera edición.
5. Implementa en fases pequeñas y valida después de cada una.
6. Sigue los patrones del proyecto: `sendSuccess`/`sendError`, `mysql2/promise`, `DataTable`, `SearchInput`, `useDebounce`, `usePagination`, `react-hot-toast`, Tailwind y funciones por módulo en `endpoints.ts`.

## Regla central: el periodo es contexto de consulta, no de pertenencia del alumno

- Filtrar por periodo en listados de matrículas y alumnos significa **acotar la información mostrada a las matrículas de ese periodo**, no ocultar permanentemente al alumno ni marcarlo como ajeno al sistema.
- Un alumno puede tener matrículas en varios periodos; su ficha (`/alumnos/:id`) ya agrupa matrículas por periodo y acepta `?periodo_id=`. Conserva ese comportamiento.
- Al filtrar alumnos por periodo, el grado mostrado debe provenir de la matrícula de ese periodo (no de la caché `alumnos.grado_id`, que refleja el último periodo). Incluye en la respuesta el estado de la matrícula en el periodo consultado.
- Los permisos se revalidan en backend siempre; el filtro de UI nunca es la única barrera.

## Fase 1: filtro de periodo en Matrículas

- Añadir un selector de periodo en `/admin/matriculas` siguiendo el patrón de `PagosPage`: cargar `periodosApi.getAll()`, incluir opción "Todos los periodos académicos", preseleccionar el periodo activo y resetear la paginación al cambiarlo.
- Enviar `periodo_id` en `matriculasApi.getAll(...)` y en `matriculasApi.getEstadisticas(...)`; recargar estadísticas y tabla al cambiar el filtro (sin duplicar lógica de fetch).
- Ajustar `getEstadisticasMatricula` si hace falta para que los conteos (total, por grado, por estado) sean consistentes con el periodo filtrado; con "Todos los periodos" mantener el comportamiento global actual.
- Mostrar en la tabla el nombre del periodo (ya viene del join) y, si es útil, el grado de la matrícula para distinguir filas en la vista global.
- Estados de carga, vacío ("No hay matrículas para el periodo seleccionado") y error claros.

## Fase 2: filtro de periodo en Alumnos

- Extender `GET /api/alumnos` para que el administrador pueda filtrar por `periodo_id`: cuando se reciba, devolver solo alumnos con matrícula (preferentemente `activa`) en ese periodo, con el grado y estado de **esa** matrícula. Documenta el comportamiento de `estado` en la respuesta cuando el filtro está activo.
- Añadir el mismo selector de periodo en `/alumnos` (patrón Pagos/Horarios, "Todos los periodos" + activo por defecto). Combinarlo con el `SearchInput` existente sin romper la búsqueda.
- La columna de grado debe reflejar el periodo consultado; mantener el badge "Sin matrícula" solo en la vista global.
- No alterar el alcance del profesor (`profesorAlcance` / filtro existente por `periodo_id`); no exponer alumnos de otros periodos por accidente.

## Fase 3: rematrícula de alumnos de periodos anteriores

Objetivo: que un alumno ya registrado (con matrículas en un periodo histórico) pueda ser matriculado de nuevo en el periodo seleccionado sin volver a crear el alumno.

- **Reutilizar** `createMatricula` como núcleo (validación de oferta, auto cursos, reactivación, actualización de caché del alumno). No dupliques la lógica en un controlador paralelo.
- UX mínima recomendada:
  1. Desde el filtro de periodo en `/alumnos` o `/admin/matriculas`, detectar alumnos con matrículas en periodos anteriores y sin matrícula activa en el periodo seleccionado (o con matrícula cancelada).
  2. Acción "Rematricular" (individual) que abra el modal existente de matrícula ya precargado: alumno, periodo destino (el seleccionado), grado heredado de la última matrícula (editable) y `auto_cursos` activo por defecto.
  3. Confirmación clara antes de enviar; el backend es la autoridad sobre duplicados y oferta válida.
- Si se ofrece rematrícula masiva (opcional, fase posterior): endpoint dedicado con transacción, `FOR UPDATE` sobre los alumnos, resultado por alumno (éxito / ya matriculado / grado sin oferta / error) y límite razonable de lotes. Respeta `UNIQUE(alumno_id, curso_id, periodo_academico_id)` y el ciclo de vida del periodo (solo se matricula en un periodo vigente o al menos dentro de su rango de fechas según la regla actual de activación).
- La rematrícula **no** migra pagos, asistencias ni calificaciones del periodo origen. Deja explícito en la UI que solo se replica la inscripción académica.
- Si el periodo destino no tiene configurada la estructura (`periodo_grados` / `periodo_grado_cursos` para el grado), el mensaje debe guiar a clonar/configurar la oferta (existe `clonarConfiguracionPeriodo` en Configuración académica) en vez de fallar en seco.

## Fase 4: coherencia de análisis y detalles

- Alinear `PeriodoDetailPage` y el nuevo filtro para que usen el mismo endpoint y muestren los mismos estados de matrícula.
- `GET /api/alumnos/:id` con `?periodo_id=` debe seguir coherente: grado, cursos y calificaciones del periodo consultado.
- Tipos en `frontend/src/types/index.ts` actualizados (filtros, nuevos campos de respuesta); evitar `any`.
- Limpieza de logs de depuración en los flujos tocados.

## Validación

- Pruebas backend con `node --test` en `backend/tests/` (cubrir: filtro `periodo_id` en matrículas y alumnos, rematrícula que reactiva/cancella duplicados, rechazo de curso no ofrecido en el periodo destino).
- Si aplica, Playwright en `frontend/tests/e2e/` para el filtro visible en `/admin/matriculas` y `/alumnos`.
- Verificar manualmente con seed: periodo `2025-II` (histórico) y `2026-I` (activo) — filtrar por cada uno y rematricular un alumno de `2025-II` a `2026-I`.
- No romper el comportamiento actual sin filtro ("Todos los periodos") ni la matrícula manual existente.

## Fuera de alcance

- Migración automática de pagos, asistencias o calificaciones entre periodos.
- Cambiar la semántica de `alumnos.grado_id`/`periodo_academico_id` más allá de lo que ya hace `createMatricula`.
- Eliminación dura de matrículas (sigue deshabilitada en producción; usar `cancelada`).
- Reescritura del ciclo de vida de periodos (`periodoVigencia.ts`).
