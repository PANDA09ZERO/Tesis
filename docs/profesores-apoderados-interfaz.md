# Interfaz de Profesores y Apoderados

## Alcance y diseño

Se adaptan `/profesores`, el detalle `/profesores/:id`, `/admin/apoderados` y la consulta docente `/profesor/apoderados`. Se conservan las rutas y sus autorizaciones, las tablas y los endpoints existentes. No se cambia el panel familiar ni se permite a profesores administrar apoderados.

Los directorios administrativos comparten cabecera con actualización y total de resultados de la consulta, búsqueda con reinicio a la primera página, tarjetas móviles y tabla de escritorio. El listado de profesores sigue mostrando únicamente cuentas activas, según su API; los apoderados conservan la consulta de activos e inactivos existente. Los totales no se filtran por el selector académico global porque estos endpoints son directorios de personas.

Las tarjetas presentan identidad, contacto, estado y acciones con etiquetas accesibles. Se reutilizan `DataTable`, `Modal`, `ConfirmDialog`, `Badge`, `SearchInput`, `usePagination` y `useDebounce`. Los estilos nuevos se limitan a estas superficies y ventanas; el tema oscuro conserva negros y grises, incluidos botones e iconos. `SearchInput` incorpora una etiqueta accesible basada en el texto de búsqueda existente.

## Profesores

- Creación con los campos actuales y contraseña inicial; el DNI vacío se envía como `null`, evitando registrar cadenas vacías como un identificador único.
- Edición limitada a especialidad, título, fecha de ingreso y contraseña opcional, que son los campos que guarda `updateProfesor`. Nombre, apellido, correo, DNI y teléfono quedan de consulta con indicación de gestionar correcciones en Usuarios.
- Se conserva el uso exclusivo de Estructura académica para las asignaciones de curso, grado y periodo. El formulario no añade selectores duplicados.
- Se comprueba el límite existente de 72 bytes de contraseña; los errores del servidor se muestran dentro del formulario, conservando los datos. Durante el guardado se bloquean campos y cierre.
- Desactivación con confirmación y estado de carga. Se conserva el comportamiento del backend: pierde acceso y se mantienen registros académicos y pagos.
- Detalle con identidad, contacto, asignaciones y alumnos en una distribución adaptable. El enlace Gestionar en Estructura mantiene su profesor seleccionado.

## Apoderados

- El listado muestra errores y reintento, y descarta respuestas anteriores cuando cambia la consulta.
- Al editar se consulta `GET /apoderados/:id` antes de mostrar el formulario. El listado no incluye fecha de nacimiento y género: no se deben reemplazar por valores vacíos o predeterminados al editar.
- La edición envía únicamente ocupación, teléfono, dirección, fecha de nacimiento y género. Nombre, apellido, correo y DNI son de consulta porque el endpoint no los actualiza.
- Se conserva la regla actual del backend: campos personales enviados vacíos mantienen su valor anterior. La interfaz lo explica; no se cambia esa política.
- Creación con contraseña inicial, mostrar/ocultar, límites y validación HTML; DNI vacío como `null`. Las validaciones definitivas se mantienen en el servidor.
- La ventana Asignar Alumno muestra los vínculos existentes usando `GET /apoderados/:id/alumnos`. Búsqueda y paginación de alumnos reutilizan `GET /alumnos`, sin el límite fijo de los primeros 100 registros de la vista anterior.
- Los alumnos vinculados se excluyen del selector; al guardar se reutiliza el endpoint existente, que rechaza duplicados. Un error conserva la selección y se muestra claramente. Si fallan las consultas de alumnos o vínculos, se impide asignar y se ofrece reintento.
- Se conserva la eliminación existente y su confirmación; no se transforma en una nueva política de desactivación ni se añade eliminación de la cuenta de usuario.

## Consulta del profesor

`/profesor/apoderados` conserva `getMisApoderados` y el alcance del servidor. Presenta tarjetas móviles y tabla de escritorio, búsqueda por apoderado o alumno y actualización con reintento. No ofrece crear, editar, vincular ni eliminar. Los resultados representan los vínculos devueltos por la API; un apoderado puede aparecer asociado a más de un alumno.

## Archivos

- `frontend/src/components/ui/PeopleDirectory.tsx` y `people-directory.css`: cabecera y tarjetas compartidas, estilos limitados a estas vistas.
- `frontend/src/components/ui/SearchInput.tsx`: etiqueta accesible.
- `frontend/src/pages/teachers/ProfesoresPage.tsx`: listado y formulario.
- `frontend/src/pages/teachers/ProfesorDetailPage.tsx`: detalle adaptable.
- `frontend/src/pages/teachers/ProfesorApoderadosPage.tsx`: consulta de contactos con alcance docente.
- `frontend/src/pages/admin/ApoderadosPage.tsx`: directorio, formulario completo y vínculos.
- `frontend/tests/e2e/personas-ui.spec.ts`: pruebas nuevas de interfaces y operaciones.

## Validación

- `cd frontend && npm run build`: correcto. Se mantiene la advertencia de Vite sobre el paquete principal (aproximadamente 984 kB sin comprimir).
- `cd frontend && npm run test:e2e -- personas-ui.spec.ts asignaciones.spec.ts familia.spec.ts roles.spec.ts`: 34 pruebas aprobadas en Chromium de escritorio y Pixel 7.
- Se comprobó registro, edición, persistencia, desactivación de profesores, conservación del perfil completo de apoderados, vinculación y rechazo de duplicados, errores con reintento, búsqueda, temas, anchura de 320 px y consulta del profesor limitada a sus alumnos.
- `git diff --check` de los archivos rastreados de esta etapa y revisión de espacios finales de los nuevos: sin errores.
- Revisión visual de capturas móviles y de escritorio; tonos neutros del modo oscuro confirmados.

La primera ejecución detectó una etiqueta ambigua en Género; se añadió una etiqueta explícita también a Parentesco y se repitió el conjunto completo de 34 pruebas con resultado satisfactorio.

Las pruebas usan cuentas sintéticas y una base temporal creada y eliminada por el wrapper E2E. No se modifican datos institucionales. Las políticas de edición, desactivación y eliminación descritas proceden de los controladores existentes; no se han inventado nuevas reglas institucionales.

## Capturas

- [Profesores: móvil claro](capturas/profesores-claro-mobile.png) y [móvil oscuro](capturas/profesores-oscuro-mobile.png).
- [Profesores: escritorio claro](capturas/profesores-claro-desktop.png) y [escritorio oscuro](capturas/profesores-oscuro-desktop.png).
- [Apoderados: móvil claro](capturas/apoderados-claro-mobile.png) y [móvil oscuro](capturas/apoderados-oscuro-mobile.png).
- [Apoderados: escritorio claro](capturas/apoderados-claro-desktop.png) y [escritorio oscuro](capturas/apoderados-oscuro-desktop.png).
