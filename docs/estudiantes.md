# Perspectiva de estudiante

La cuenta con rol `alumno` consulta su información a partir del `userId` del JWT. No hay selector de alumnos. Cambiar un ID en una petición no concede acceso a otro alumno. El servidor restringe también las rutas, aunque se llame directamente a la API.

## Acceso y navegación

- `/dashboard` y `/`: panel personal, matrícula, cursos inscritos, cargos pendientes, próximas evaluaciones, horario semanal y avisos personales.
- `/estudiante/perfil`: datos personales de consulta y cambio de contraseña con la operación existente. Los cambios de datos personales o académicos corresponden a administración.
- `/estudiante/cursos`: inscripciones propias; cada detalle usa el ID de una matrícula propia y muestra profesores, evaluaciones, notas, asistencia y horarios.
- `/estudiante/calificaciones`, `/estudiante/asistencia`, `/estudiante/horarios`: consultas personales con periodo propio. Las notas y asistencias admiten filtros por curso; la asistencia también por fechas.
- `/estudiante/pagos`: pestañas independientes para matrícula y mensualidades, con filtros y totales del concepto seleccionado. No registra pagos ni realiza cobros en línea.
- `/calendario`: clases y evaluaciones de los cursos inscritos, según curso, grado y periodo; requiere la oferta exacta de la matrícula. Los horarios antiguos sin oferta se conservan para revisión, sin atribuirlos por inferencia. Véase [la unificación académica](asignaciones-academicas.md).
- `/documentos`: documentos propios y documentos comunes publicados por administración; descargas autenticadas. Los formularios publicados admiten respuestas validadas asociadas automáticamente al alumno de la sesión. Cada estudiante consulta únicamente sus envíos.
- `/alertas` y `/estudiante/notificaciones`: alertas propias de consulta y notificaciones personales. Se conservan las acciones existentes de marcar como leída y eliminar una notificación propia.

Las rutas anteriores `/calificaciones` y `/asistencias` muestran la consulta personal. `/cursos` y `/horarios` redirigen a sus secciones personales. Se bloquean catálogos generales, compañeros, administración, reportes globales y escritura académica o financiera.

## Reglas académicas y financieras

1. El grado, periodo y cursos proceden de `matriculas`, con el respaldo existente del grado del curso para matrículas antiguas sin grado. Los campos antiguos de grado/periodo en `alumnos` no determinan las asignaciones.
2. Los cursos aparecen desde la inscripción, aunque el pago de matrícula esté pendiente. Un pago no crea inscripciones ni cambia notas o mensualidades.
3. Los periodos disponibles proceden de las matrículas y de registros propios de pagos, notas o asistencia con oferta. Así se conserva el historial aunque una inscripción anterior ya no exista. Estos registros no generan cursos ficticios.
4. La matrícula financiera procede únicamente de `pagos_matricula`, una fila por alumno y periodo. Las mensualidades proceden únicamente de `mensualidades`, con su mes/año, importe, estado y fecha propios. Los totales no suman el pago repetido en cada curso.
5. Un cobro de matrícula inexistente se muestra como «Sin cobro registrado»; no se inventa su importe ni se da por pagado. Se conservan los estados existentes de mensualidades, incluido `descuento`, sin reinterpretarlo como pago.
6. Periodos históricos y actuales son de consulta para estudiantes. No pueden registrar, editar o borrar notas, asistencia, matrículas, cursos, horarios o pagos.
7. Las notas anteriores sin evaluación vinculada permanecen visibles. Se muestra el máximo de la evaluación cuando existe. No se añade un promedio ponderado ni una regla de aprobación.
8. Un perfil sin matrícula puede consultar datos personales, documentos, formularios y avisos. Una cuenta sin perfil de alumno recibe un error claro, sin usar otro alumno como respaldo.
9. Un fallo SQL o del servidor produce un error; el frontend lo muestra y permite reintentar. Las respuestas vacías exitosas corresponden a ausencia real de registros.
10. Se mantiene la regla existente de contraseña nueva de al menos seis caracteres. Una contraseña actual incorrecta responde 400, evitando que el interceptor de sesión la confunda con un JWT vencido.

## API

Todos requieren autenticación y rol `alumno`:

- `GET /api/estudiante/contexto`: perfil personal, periodos disponibles e inscripciones agrupadas.
- `GET /api/estudiante/periodo?periodo_id=...`: cursos, evaluaciones, notas, asistencia, horarios y pagos propios del periodo. Sin parámetro usa el primer periodo propio activo, o el más reciente; sin historial devuelve el estado vacío real.
- `GET /api/estudiante/cursos/:matriculaId`: detalle de una inscripción propia.

Se reutilizan las APIs existentes para calendario, documentos, formularios, alertas, notificaciones y cambio de contraseña. La política `limitarEstudiante` complementa la comprobación de propiedad de sus controladores. No se añadieron tablas ni se necesita una migración para esta entrega.

## Reglas que requieren definición institucional

- El modelo no tiene un estado de publicación de notas para el estudiante. Se conserva la consulta de sus notas registradas. Si deben ocultarse hasta la publicación o cierre, debe definirse y confirmarse esa regla antes de implementarla.
- La asistencia antigua sin `periodo_grado_curso_id` solo dispone de fecha y curso. Se mantiene su clasificación por el rango de fechas del periodo seleccionado. Si existen periodos superpuestos, puede corresponder a más de uno; no se asignó ni modificó su periodo por inferencia. La institución debe definir cómo resolver esos registros ambiguos. Los registros antiguos sin matrícula ni oferta no permiten deducir un periodo solo con seguridad.
- No existe una regla de ponderación general o promedio final para esta vista. Se conservan las notas y máximos individuales existentes.

## Validación

Desde `backend`:

```powershell
npm run build
npm run test:estudiantes
npm run test:payments
npm run test:payments:db
npm run test:profesores
```

Desde `frontend`: `npm run build`.

Las pruebas HTTP crean bases `estudiante_test_*`, `payments_test_*` y `profesor_test_*`, usan datos sintéticos y eliminan exclusivamente esas bases al terminar. La suite de estudiante clona la estructura de tablas reales, sin copiar filas reales. Comprueba dos cuentas distintas, un alumno sin matrícula, una cuenta sin perfil, periodos históricos, pagos independientes, validación, descargas y persistencia de formularios y contraseña. Las pruebas unitarias comprueban el rechazo de IDs inválidos y que un fallo del servidor nunca devuelva un éxito de respaldo.


## Actualización de sesiones y reportes (14 de octubre de 2026)

El backend comprueba usuario activo y rol vigente en cada petición. Cambiar contraseña cierra todas las sesiones, incluida la actual, y requiere un nuevo login. Las sesiones anteriores al formato actualizado del token también deben iniciar sesión nuevamente. Los reportes y resúmenes corregidos separan periodo, grado y escala; las notas antiguas sin escala se conservan, sin promedios comparables ni aprobación inventada. Consulta [el informe integral](correccion-integral.md) para los archivos, pruebas, alcance y reglas pendientes.

## Revisión de calificaciones y asistencia (23 de octubre de 2026)

Se revisaron los libros por oferta, el tratamiento de escalas, las validaciones de las rutas antiguas y la asistencia histórica. Los cambios y el diagnóstico de registros heredados pendientes se documentan en [la revisión de calificaciones y asistencia](revision-calificaciones-asistencia.md). No se modificaron datos académicos reales.
