# Perspectiva del apoderado

Actualizado: 21/10/2026. Las mejoras se implementaron sobre los componentes y tablas existentes, sin migraciones ni cambios en los datos reales.

## Inicio y navegación

La ruta `/familia/alumnos` muestra **Estudiantes a mi cargo**, con una tarjeta por vínculo registrado. Incluye nombre, código, parentesco, grado/periodo derivados de la matrícula, cantidades académicas y accesos a Resumen, Cursos y horarios, Calificaciones y Asistencia. El perfil y cambio de contraseña propios se conservan.

El detalle mantiene `/alumnos/:id`, usando una vista específica para apoderados; las vistas de administrador y profesor no se reemplazan. `periodo_id` y `vista` quedan en la URL para conservar la selección al recargar o compartir una ruta dentro de la cuenta autorizada. Las secciones son botones de navegación con desplazamiento horizontal en pantallas pequeñas; las tablas reutilizan DataTable.

## Datos y permisos

- `GET /api/apoderados/me/inicio`: resúmenes exclusivamente de estudiantes vinculados al usuario autenticado.
- `GET /api/apoderados/me/alumnos/:alumnoId/resumen?periodo_id=...`: detalle autorizado, con rechazo de IDs inválidos (400), estudiantes ajenos y periodos no disponibles (404).
- Ambas rutas requieren rol apoderado. No se aceptan escrituras ni se amplía acceso a pagos, mensualidades o sueldos.
- Los periodos provienen de matrículas, notas y asistencia académica; un periodo que solo tiene pagos no concede visibilidad.
- Se elige primero un periodo activo propio; si no existe, el último periodo académico registrado. El selector ofrece los periodos propios, incluidos históricos.
- En un periodo activo, el grado y contador de cursos proceden de inscripciones activas. El detalle conserva inscripciones canceladas/pendientes con su estado; los periodos históricos mantienen la consulta del registro.
- Notas y asistencia usan las fuentes normalizadas existentes. No se inventan promedios, aprobación o escalas para notas históricas. La asistencia distingue registros por clase y días únicos. Los registros antiguos sin periodo inequívoco se avisan y no se suman al periodo seleccionado.
- Los horarios reutilizan la consulta existente por curso, grado y periodo de matrícula activa; no se muestran horarios de otros grupos por compartir un curso de catálogo.

## Pendientes y estados

Se muestran inasistencias **registradas como ausente**, con curso y fecha. No se inventan umbrales de riesgo ni alertas automáticas. Por solicitud del usuario, se retiraron Documentos, sus descargas, pendientes y contadores de la perspectiva del apoderado. Los endpoints de resumen familiar ya no consultan ni incluyen documentos. El módulo general y los archivos existentes se conservan.


La carga tiene mensaje visible y no presenta valores cero de respaldo. La ausencia de vínculos explica cómo solicitar la asignación a administración. Los vacíos académicos distinguen falta de matrícula, notas, asistencia, u horarios. Fallos de API/SQL muestran error y reintento, sin convertirlos en listas vacías exitosas. Se descartan respuestas tardías tras cambiar de estudiante o periodo.

## Archivos y validación

Backend: `controllers/familia.controller.ts`, rutas de apoderados y guarda global del rol. Frontend: páginas `guardian/FamilyStudentsPage.tsx`, `FamilyStudentDetailPage.tsx`, contrato `guardian/familia.ts`, cliente API, Sidebar y selector de vista del detalle del alumno. Pruebas: `backend/tests/familia.test.cjs`, nuevos casos en `integral.integration.test.cjs`, `frontend/tests/e2e/familia.spec.ts`. CI y el ejecutor backend incluyen las nuevas pruebas..

Comandos desde las carpetas respectivas:

```bash
# Backend: MySQL de desarrollo; las pruebas escriben solo en bases temporales sintéticas.
npm run test:familia
npm run test:all
# Frontend: backend ya compilado.
npm run build
npm run test:session
npm run test:e2e
```

No se modificaron contraseñas, vínculos, matrículas, notas, asistencias ni archivos reales. La política financiera del apoderado sigue bloqueada. Reglas institucionales futuras de gestión de justificaciones o alertas requerirán una definición explícita; no son necesarias para estas seis mejoras.

Validación previa a retirar Documentos (21/10/2026): suite completa del backend aprobada, compilación del frontend aprobada, 5 pruebas de sesión y 18 pruebas de navegador aprobadas (escritorio y vista móvil). Se revisaron capturas de ambas vistas y `git diff --check` no detectó errores de formato. Vite mantiene la advertencia sobre el tamaño del paquete principal superior a 500 kB; la compilación finaliza correctamente.

En este equipo, las pruebas completas del backend se ejecutaron con `MYSQL_BIN` y `MYSQLDUMP_BIN` apuntando a los ejecutables de MySQL Server 8.0. Las de navegador utilizaron Chromium instalado en `PLAYWRIGHT_BROWSERS_PATH`. Estas variables seleccionan herramientas locales y no cambian la configuración de producción.

Validación tras retirar Documentos: npm run test:familia aprobado (4 casos unitarios y suite integral de 17 casos); npm run build del frontend aprobado; npm run test:e2e -- --grep familia aprobado (8 pruebas entre escritorio y vista móvil). Las rutas antiguas con vista=documentos presentan Resumen y no muestran la sección retirada.
