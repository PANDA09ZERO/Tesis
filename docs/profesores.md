# Perspectiva del profesor

## Alcance

Cada oferta se identifica por periodo académico, grado y curso. Desde la unificación del 21/10/2026, solo las asignaciones específicas en periodo_grado_curso_profesores conceden acceso. Las relaciones generales en profesor_curso se conservan como datos antiguos y no conceden permisos.

La autorización de matrículas usa el grado guardado en la inscripción; para filas históricas sin grado utiliza el grado del curso como respaldo. No usa el cache actual del alumno para autorizar otro periodo/grado. Se reutilizan las funciones de alcance existentes y se centralizan las comprobaciones de alumno, registro y horario en backend/src/utils/profesorAlcance.ts.

Las asignaciones se administran exclusivamente desde Estructura académica. Profesores y Cursos consultan esa misma fuente; Horarios reutiliza sus responsables. Las relaciones manuales antiguas requieren revisión para registrar explícitamente el periodo, grado y curso que corresponda; no se migraron ni eliminaron por inferencia. Consulta [la unificación académica](asignaciones-academicas.md) para los contratos y el diagnóstico pendiente.

## Funcionalidades

- Inicio y dashboard: panel personal con selector de periodos propios, número de grupos y alumnos matriculados, alertas de esos alumnos, horarios, próximas evaluaciones activas y notificaciones personales. Usa el primer periodo propio activo o el más reciente histórico; sin asignaciones muestra un estado vacío real. No utiliza el dashboard institucional.
- Mis cursos, calificaciones y asistencia: listado común de ofertas, selector de periodos asignados, estados activo/histórico, carga y errores con reintento. Mis cursos respeta la búsqueda de la cabecera.
- Detalle de oferta: solo alumnos matriculados en ese periodo, grado y curso. Los enlaces al detalle del alumno conservan el periodo, también en históricos.
- Alumnos/apoderados: proceden de las matrículas y asignaciones, no de alumnos que simplemente compartan un grado. Sin periodo explícito se usa el activo; las consultas históricas indican periodo_id.
- Calificaciones: matrícula exacta, rango de nota y máximo de evaluación, rechazo de valores inválidos, evaluaciones cerradas y evaluaciones de otra oferta. Tanto rutas de oferta como antiguas comprueban el alcance.
- Asistencia: fecha dentro del periodo, alumno matriculado, estados/minutos válidos y lotes transaccionales. La pantalla espera a cargar la sesión elegida antes de permitir guardar y descarta respuestas antiguas de otras fechas.
- Mis horarios/calendario: profesor asignado y periodo correspondientes. Solo se muestran horarios con oferta y responsabilidad específica válidas. Los horarios antiguos sin oferta se conservan para revisión y no se atribuyen por inferencia. No se permite administrar horarios al profesor.
- Documentos: conserva documentos propios/asignados y comunes publicados por administración. Solo puede editar los propios/asignados; subir un documento asociado a un alumno exige que esté dentro de su alcance. Los formularios publicados siguen su modelo global existente y las operaciones de definición/publicación permanecen administrativas.
- Alertas: lista, resumen y actualización usan el mismo conjunto de alumnos autorizado. La alerta es por alumno, no por curso; no se añadió una asociación inexistente.
- Mis notificaciones: reutiliza la pantalla existente para consultar, filtrar y marcar avisos personales. Consultar, marcar o eliminar el ID de otro destinatario se rechaza. Crear o enviar avisos sigue reservado a administración.
- Usuarios, profesores, matrículas, pagos, configuración e informes administrativos mantienen los bloqueos del rol, también mediante llamadas directas a las APIs.

## Periodos históricos

Por indicación explícita del usuario, los profesores tienen **solo consulta** en periodos con activo=0. La interfaz deshabilita registro de notas/asistencia y creación de evaluaciones. El backend devuelve 409 en esas operaciones, incluidas rutas antiguas y modificación de notas por ID. Los permisos del administrador sobre históricos se conservan.

No se añadieron reglas nuevas sobre edición dentro del periodo activo, cierre de matrícula o publicación documental. Una evaluación con estado='cerrada' no admite cambios de notas; se conservó esa regla y se impide omitirla llamando a la ruta antigua de actualización.

## Modelo y migraciones

No se añadieron tablas académicas ni se copiaron cursos/alumnos a otra estructura. La base local carecía de notificaciones; se aplicó la migración ya existente database/migrations/create_notificaciones_table.sql. No se insertaron avisos reales ni se borraron datos.

Los registros de asistencia antiguos sin oferta no contienen un periodo explícito; sus consultas se restringen usando matrícula, curso y fecha dentro del periodo. Si existieran periodos solapados y registros sin oferta, el dato antiguo puede ser ambiguo. No se asignó un periodo arbitrario ni se reescribió el historial; las nuevas pantallas del profesor usan la oferta identificada.

## Pruebas y validación

Desde backend:

```sh
npm run build
npm run test:profesores
node --test tests/profesores.test.cjs tests/profesores.integration.test.cjs tests/payments.test.cjs tests/payments.integration.test.cjs
```

Desde frontend:

```sh
npm run build
```

En el sandbox de esta sesión se precargó work/realpath-compat.cjs mediante NODE_OPTIONS para sustituir la función nativa de resolución de rutas bloqueada en Windows por fs.realpathSync. No cambia la configuración ni las rutas del proyecto.

Las pruebas de profesores usan una base temporal profesor_test_* y JWT con dos profesores distintos, un tercero sin asignaciones y un administrador. Clonan únicamente la estructura real (CREATE TABLE LIKE), sin copiar filas reales, y eliminan la base temporal al finalizar. Cubren oferta/grado/periodo, IDs ajenos, matrícula exacta, rechazo de permisos basados en asignaciones manuales, lectura histórica, escritura bloqueada, notas/evaluaciones, asistencia, rollback, dashboard, documentos, horarios/calendario, notificaciones y bloqueo administrativo.

El servidor debe recargar los controladores modificados. Si se ejecuta con npm start, reiniciar el backend; el build del frontend ya genera frontend/dist.

## Revisión adicional de la perspectiva de profesores

Se corrigió el enlace `/cursos` para utilizar `RoleCursosPage` y la pantalla existente de ofertas del profesor, en lugar del catálogo antiguo. Se añadió `/profesor/perfil`, de consulta, con cambio de contraseña mediante `/api/auth/change-password`. Los datos institucionales siguen editándose por administración.

Las APIs personales nuevas, ambas de consulta y exclusivas del rol profesor, son:

- `GET /api/profesores/me/perfil`: obtiene el perfil por el usuario autenticado, nunca por un ID elegido en el formulario. No devuelve contraseña ni sueldo.
- `GET /api/profesores/me/resumen?periodo_id=...`: valida que el periodo pertenezca a sus asignaciones, cuenta alumnos activos en matrícula sin duplicarlos, cuenta grupos y alertas, y devuelve próximas evaluaciones de esos grupos. Rechaza un periodo ajeno con 404 y un filtro inválido con 400. Sin asignaciones devuelve el estado vacío real.

El panel reutiliza las APIs existentes de ofertas, horarios y notificaciones. Las respuestas antiguas de otra selección se descartan. Un error de cualquiera de sus consultas se muestra y permite reintentar; no se convierte en un panel exitoso de respaldo.

Se corrigió el manejo de errores al obtener la conexión de los lotes de notas y asistencia por oferta. La adquisición ahora está dentro de `try`, y la liberación y reversión verifican que exista conexión. Los fallos de conexión o escritura responden con error; las pruebas verifican que una segunda escritura de notas fallida revierte todo el lote. También se rechazan tipos incorrectos de nombre, tipo, fecha y máximo en la creación de evaluaciones, conservando los límites existentes.

No hay un permiso existente para que un profesor consulte sueldos: el router de sueldos requiere administrador. No se añadió acceso financiero a la cuenta del profesor. La regla administrativa de registro directo como pagado, con profesor, mes/año y monto, permanece intacta.

No se añadieron tablas ni migraciones en esta revisión. Las pruebas agregadas se ejecutan junto con las suites existentes de profesores, estudiantes y pagos en bases temporales sin copiar filas reales.

### Reglas que no se deducen del modelo

- Publicación de notas, ponderación y promedio final: no se definieron condiciones nuevas; se conservan notas, máximos de evaluación y cierres existentes.
- La edición o cierre de la definición de una evaluación no tiene una operación existente en este módulo: se conservan creación y consulta, y la actualización de notas sobre evaluaciones activas. Hace falta definir el efecto sobre notas ya registradas antes de añadir cambios de escala o cierre de la evaluación.
- Asistencia antigua sin oferta en periodos superpuestos: no puede asignarse un periodo único con seguridad y no se reclasificó por inferencia.
- Las relaciones manuales antiguas no identifican grado ni periodo. Debe confirmarse su correspondencia antes de registrarlas como asignaciones específicas en Estructura; no conceden acceso mientras tanto. El modelo tampoco define vigencia o sustitución retroactiva de responsables: se protege el historial y se bloquea el retiro de asignaciones con referencias.


## Actualización de sesiones y reportes (14 de octubre de 2026)

El backend comprueba usuario activo y rol vigente en cada petición. Cambiar contraseña cierra todas las sesiones, incluida la actual, y requiere un nuevo login. Las sesiones anteriores al formato actualizado del token también deben iniciar sesión nuevamente. Los reportes y resúmenes corregidos separan periodo, grado y escala; las notas antiguas sin escala se conservan, sin promedios comparables ni aprobación inventada. Consulta [el informe integral](correccion-integral.md) para los archivos, pruebas, alcance y reglas pendientes.

## Revisión de calificaciones y asistencia (23 de octubre de 2026)

Se revisaron los libros por oferta, el tratamiento de escalas, las validaciones de las rutas antiguas y la asistencia histórica. Los cambios y el diagnóstico de registros heredados pendientes se documentan en [la revisión de calificaciones y asistencia](revision-calificaciones-asistencia.md). No se modificaron datos académicos reales.
