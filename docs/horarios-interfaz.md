# Interfaz de Horarios

## Alcance

La página `/horarios` de administración y profesores y la vista `/estudiante/horarios` comparten una presentación semanal adaptable. Se conservan las rutas, endpoints, tablas y permisos existentes. El panel inicial del profesor y el detalle de curso del alumno conservan sus resúmenes actuales.

## Presentación

- Tarjetas por día, ordenadas por hora de inicio y fin. Miércoles y sábado se muestran con tilde sin modificar los valores enviados al servidor.
- Búsqueda por curso, grado, profesor, aula o periodo, sin distinguir mayúsculas ni tildes.
- Botones Semana y días individuales; Limpiar filtros restablece la consulta local.
- Resúmenes de bloques, días con clases y nombres de cursos distintos que corresponden a los filtros visibles. No son totales institucionales ni horas acumuladas.
- Aula, docente, grado y periodo permanecen visibles; se conserva la advertencia sobre horarios históricos sin oferta.
- Móvil con controles táctiles y tarjetas; escritorio con columnas por día. Modo claro y oscuro neutro mediante los colores existentes.
- Estados de carga, vacío, error y reintento. Al cambiar de periodo se limpian los filtros locales de horarios.

## Operaciones y permisos

La administración puede crear, editar y eliminar usando `horariosApi`. El docente se obtiene de la oferta académica; si hay varios responsables, se elige entre los ya asignados. No se crea una asignación nueva desde Horarios. Se mantiene el enlace a Estructura académica y el tratamiento existente de un responsable inactivo conservado en un registro.

El formulario usa la ventana compartida y acciones adaptables. Durante el guardado se deshabilitan campos y cierre. Se comprueba que la hora final sea posterior a la inicial; los conflictos y las demás validaciones definitivas siguen en el backend. Si falla el guardado, el formulario permanece abierto con sus datos y el mensaje del servidor. Después de guardar se vuelve a consultar la lista; un fallo de esa consulta muestra el error de carga.

El profesor consulta los bloques permitidos por el alcance del servidor, sin acciones de modificación. El alumno usa únicamente `estudianteApi.getPeriodo` y los horarios asociados a sus matrículas. No se habilitan rutas ni datos para otros usuarios. La selección de periodos activos e históricos conserva las reglas existentes.

## Archivos

- `frontend/src/components/academics/WeeklySchedule.tsx`: presentación compartida, filtros, resúmenes y tarjetas.
- `frontend/src/pages/academics/HorariosPage.tsx`: integración administrativa/docente y formulario.
- `frontend/src/pages/students/EstudiantePage.tsx`: integración en Mis horarios.
- `frontend/tests/e2e/horarios-ui.spec.ts`: consulta por rol, filtros, orden, periodos, temas, errores y operaciones.

## Validación

- `cd frontend && npm run build`: correcto; persiste la advertencia de Vite por el tamaño del paquete principal (aproximadamente 975 kB sin comprimir).
- `cd frontend && npm run test:e2e -- horarios-ui.spec.ts asignaciones.spec.ts roles.spec.ts dashboard-mobile.spec.ts`: 27 aprobadas y 1 omitida (caso exclusivo de móvil en el proyecto de escritorio).
- Las pruebas nuevas de Horarios pasaron en Chromium de escritorio y Pixel 7: administración, profesor, alumno, filtros, orden por hora, consulta histórica, edición/eliminación, validación y errores. La suite existente de asignaciones verifica también la creación y selección de docentes.
- `git diff --check` de los archivos rastreados de esta etapa: correcto.
- Se revisaron las capturas de administración en escritorio y móvil, con tema oscuro neutro.

## Capturas

- [Móvil claro](capturas/horarios-claro-mobile.png).
- [Móvil oscuro](capturas/horarios-oscuro-mobile.png).
- [Escritorio claro](capturas/horarios-claro-desktop.png).
- [Escritorio oscuro](capturas/horarios-oscuro-desktop.png).

Las pruebas usan una base temporal con cuentas sintéticas. Los bloques creados para verificar operaciones se eliminan al terminar. No se modifican datos institucionales ni se inicia el backend real.
