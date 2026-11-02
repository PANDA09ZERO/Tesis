# Adaptación de la interfaz de Alumnos

## Alcance

Segunda etapa visual después del dashboard: listado, formularios existentes y detalle académico de alumnos. Se conservan APIs, rutas, validaciones del servidor, permisos y relaciones. No se cambiaron backend, esquema ni datos institucionales.

### Listado

- Cabecera «Alumnos» para administración y «Mis alumnos» para docentes.
- En teléfonos, tarjetas con iniciales, nombre, código, estado de matrícula, grado y correo. Botones visibles para consultar; edición y rematrícula solo cuando corresponden según los permisos y condiciones existentes.
- En escritorio, tabla con sus columnas y acciones. Se conserva la paginación compartida.
- Buscador y filtro de matrícula compactos; reutilizan el periodo global. El total mostrado viene del endpoint, no del número de tarjetas de una página.
- Los errores aparecen con «Reintentar alumnos». Las respuestas anteriores no sustituyen el resultado de una selección nueva.
- Colores claros existentes y modo oscuro en negro mate/gris carbón, incluidos botones neutros.

### Detalle

Se conserva el perfil y sus datos reales. En móvil se separa la consulta en «Matrícula y cursos», «Calificaciones» y «Asistencia», sin añadir APIs ni duplicar datos. En escritorio permanecen las secciones amplias. Las rutas conservan `periodo_id`. La vista de apoderados sigue delegando en su detalle familiar existente.

### Registro, edición y rematrícula

- Registro y edición conservan los formularios existentes con etiquetas asociadas a los controles, acciones adaptables y contraste oscuro.
- El registro sigue pidiendo datos de cuenta/persona. Grado, periodo y cursos se establecen en Matrículas.
- Un DNI opcional vacío se envía como `null`, compatible con el contrato y la columna existentes. No se envía una cadena vacía que pueda chocar con el índice único al registrar otro alumno sin DNI.
- Los errores de guardado permanecen visibles dentro del formulario y conservan sus datos. Durante el envío se bloquean el cierre y los botones de guardado/cancelación.
- **Límite encontrado en la API existente:** `PUT /alumnos/:id` guarda teléfono, nacimiento y género; ignora nombre, apellido, email y DNI. Estos últimos quedan de consulta al editar, con una indicación para modificarlos en Usuarios. No se amplió el backend ni se muestra una promesa de actualización que no persiste.
- La rematrícula usa las mismas operaciones y condiciones del servidor. La carga de historial/grados y cursos muestra errores con reintento y bloquea el envío cuando no hay datos válidos. Cambiar de periodo cierra la operación que estaba preparando.

## Archivos

- `frontend/src/pages/students/AlumnosPage.tsx`
- `frontend/src/pages/students/AlumnoDetailPage.tsx`
- `frontend/src/pages/students/StudentMobileCard.tsx` (nuevo)
- `frontend/src/pages/students/students.css` (nuevo y acotado a esta sección)
- `frontend/src/components/ui/DataTable.tsx`: opciones `renderMobileCard` y `className`; los demás consumidores conservan su comportamiento predeterminado.
- `frontend/tests/e2e/alumnos-ui.spec.ts` (nuevo)
- `frontend/tests/e2e/roles.spec.ts`: aserción de marca actualizada al nombre existente «Ciencias e Ingeniería».

## Revisión manual

1. Abrir Alumnos con una cuenta administradora en teléfono. Probar búsqueda, filtro y consulta del detalle. Cambiar entre cursos, notas y asistencia.
2. Activar el modo oscuro: fondos, tarjetas y botones deben utilizar neutros, con los estados semánticos conservados.
3. Abrir Nuevo Alumno: no debe pedir grado ni periodo. Registrar una cuenta con datos de prueba autorizados; localizarla en «Todos los periodos», porque todavía no tiene matrícula.
4. Editar teléfono, guardar y volver a abrir para verificar su persistencia.
5. Consultar con un profesor: solo aparecen sus alumnos asignados y acciones de consulta. El servidor conserva la autoridad sobre el alcance.
6. Revisar escritorio: tabla, paginación y detalle amplio. Revisar un apoderado: conserva su interfaz familiar.

Las pruebas automáticas usan una base temporal sintética y cuentas de prueba. Las capturas que se adjunten a esta guía son de ese entorno, no de datos institucionales.

## Validación

- `npm run build` (frontend): correcto, TypeScript y Vite. Persiste el aviso de bundle mayor de 500 kB; el principal mide aproximadamente 958 kB sin comprimir.
- `npm run test:e2e -- alumnos-ui.spec.ts`: 10 pruebas aprobadas, escritorio y móvil.
- `npm run test:e2e`: 53 aprobadas, 1 omitida por ser exclusiva de móvil y 2 aserciones del login desactualizadas respecto de la marca actual. Las dos se corrigieron en el test, sin modificar el login.
- `npm run test:e2e -- alumnos-ui.spec.ts roles.spec.ts`: comprobación final de 20 pruebas aprobadas, incluidos los dos casos corregidos.
- `npm run test:e2e -- alumnos-ui.spec.ts -g "tarjetas y detalle móvil"`: 2 pruebas aprobadas después de compactar la cabecera móvil del detalle.
- `git diff --check` en los archivos rastreados de esta etapa: correcto.

Se revisaron capturas de listado y detalle en ambos tamaños y temas. No se ejecutó ninguna migración ni se inició un backend real adicional; los servicios E2E y la base sintética se cierran mediante el wrapper existente.

### Capturas finales con datos de prueba

- [Listado claro](capturas/alumnos-claro-mobile.png)
- [Listado oscuro](capturas/alumnos-oscuro-mobile.png)
- [Detalle oscuro](capturas/alumno-detalle-mobile.png)

