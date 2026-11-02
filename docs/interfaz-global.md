# Interfaz unificada del sistema

## Alcance

Se extiende el lenguaje visual de Dashboard, Alumnos, Módulos, Perfil, Horarios, Profesores y Apoderados al resto de las pantallas existentes. Se aplica desde el contenedor de la aplicación y los componentes comunes, sin cambiar tablas, endpoints, rutas, autorizaciones ni reglas académicas, financieras u operativas.

| Área | Adaptación |
| --- | --- |
| Cursos, ofertas y Estructura académica | Superficies, títulos, indicadores, ventanas y acciones adaptables. |
| Periodos y detalle histórico | Cabecera, tarjetas, tablas e indicadores comunes; se conserva la consulta histórica. |
| Calificaciones | Registros por alumno en tarjetas móviles con una única instancia de cada campo; tabla en escritorio. |
| Asistencia | Registro e historial en tarjetas por alumno en móvil; controles y validaciones existentes. |
| Matrículas | Título, indicadores, tablas, formularios y ventanas con diseño común. |
| Pagos | Cabecera, filtros, resúmenes y ventanas adaptables; matrícula, mensualidad y sueldos siguen separados. |
| Usuarios | Cabecera y filtros apilados en teléfono; tablas y formularios comunes. |
| Notificaciones | Cabecera, formularios en una columna móvil y componentes compartidos. |
| Documentos y formularios | Cabecera, filtros, ventanas y acciones adaptables. Se conservan los permisos; no se añade acceso documental al apoderado. |
| Alertas y Reportes | Cabeceras, indicadores, mensajes y tablas comunes. |
| Calendario | Contenedor adaptable, filtros que pueden ocupar varias líneas y superficies oscuras coherentes. |
| Alumno, profesor y apoderado | Sus vistas ya existentes reciben los estilos comunes, manteniendo sus consultas y operaciones permitidas. |
| Control del sistema | Tarjetas, campos y estados del tema compartido; operaciones privilegiadas sin modificaciones. |
| Acceso y sesión | Selector opcional de tema en login, etiqueta para mostrar contraseña, notificaciones emergentes y aviso de suspensión coherentes con el tema. |

## Diseño compartido

- Negro mate, carbón y grises para superficies y acciones en modo oscuro. El modo claro conserva sus colores existentes. Se mantienen colores semánticos para éxito, advertencia y error.
- `styles/application.css` adapta las utilidades antiguas dentro de `.app-surface`. Respeta las variantes oscuras explícitas para no sobrescribir los diseños que ya las definen.
- Contenedor `.app-page` con anchura máxima y protección contra desbordamiento de secciones. Las tablas generales mantienen tarjetas móviles mediante `DataTable`.
- Tarjetas redondeadas, indicadores con texto legible, botones táctiles y foco de teclado visible. Los campos mantienen tamaño de 16 px en móvil.
- Ventanas con modo oscuro, título accesible mediante `aria-labelledby`, rol de diálogo y botones de cierre de 44 px.
- Acciones de formularios apiladas en móvil mediante `form-actions`, reutilizando los manejadores existentes.
- Los libros de notas y asistencia usan el mismo DOM para móvil y escritorio: se agregan etiquetas de celda y una presentación de registros en tarjetas. No se duplican entradas, selecciones ni estados.
- Los avisos emergentes, que solo contienen mensajes informativos, no interceptan clics sobre los controles de la página.
- Gráficos: rejillas, texto y tooltip legibles en oscuro; el color primario del gráfico sigue la variable del tema.
- La preferencia de tema sigue siendo opcional y persistente; no se cambia automáticamente según el dispositivo.

## Archivos principales

- `frontend/src/styles/application.css`: estilos comunes, contraste, estados, tablas de registro y adaptación móvil.
- `frontend/src/index.css`: importación y tarjeta base.
- `frontend/src/components/layout/AppLayout.tsx`: superficie y contenedor comunes.
- `frontend/src/components/ui/Modal.tsx`, `DataTable.tsx`, `Badge.tsx`, `StatCard.tsx`, `PageHeading.tsx`: componentes compartidos.
- `frontend/src/main.tsx`, `components/SystemSuspended.tsx` y `context/AuthContext.tsx`: presentación de notificaciones y estados generales.
- `frontend/src/pages/auth/LoginPage.tsx`: tema opcional y controles accesibles.
- Pantallas con ajustes propios:
  - `pages/academics/CursosPage.tsx`, `ConfiguracionAcademicaPage.tsx`, `PeriodosPage.tsx`, `CursoDetailPage.tsx`, `OfertaDetailPage.tsx`, `OfertaCalificacionesPage.tsx` y `OfertaAsistenciasPage.tsx`.
  - `pages/admin/MatriculasPage.tsx`, `PagosPage.tsx`, `UsuariosPage.tsx` y `NotificacionesPage.tsx`.
  - `pages/documents/DocumentosPage.tsx`, `pages/alerts/AlertasPage.tsx`, `pages/reports/ReportesPage.tsx`, `pages/CalendarPage.tsx` y `pages/dashboard/DashboardPage.tsx`.
  - Las demás pantallas heredan los estilos desde el contenedor y los componentes comunes.
- `frontend/tests/e2e/interfaz-global.spec.ts`: comprobaciones nuevas de las trece pantallas restantes en claro/oscuro, diálogo de pago de profesor, login y anchura de 320 px.
- `frontend/tests/e2e/avisos-ui.spec.ts`: regresión del aviso de bienvenida que podía tapar la cabecera.

## Revisión manual

1. Alternar claro/oscuro y recargar: comprobar la persistencia desde login y dentro del sistema.
2. Abrir módulos académicos, administrativos y personales con cada rol. Comprobar las acciones habituales y que no aparecen accesos nuevos.
3. Revisar un libro de notas y un registro de asistencia en teléfono y escritorio. Cambiar un campo solo si se desea guardar un dato real; el rediseño no requiere cambios institucionales.
4. Abrir formularios de periodos, cursos, pagos, usuarios y documentos. Comprobar contenido, cierre y desplazamiento vertical en pantalla estrecha.
5. En Pagos de profesores, verificar que solo se solicita profesor, mes/año y monto. Los conceptos de alumnos conservan su separación.

## Validación

- `cd frontend && npm run build`: correcto; permanece el aviso de tamaño del paquete principal (aproximadamente 988 kB sin comprimir).
- `cd frontend && npm run test:session`: 6 pruebas aprobadas.
- `cd frontend && npm run test:e2e`: 134 pruebas aprobadas y 2 omitidas (casos exclusivos de móvil en el proyecto de escritorio).
- Revisión final de registros de notas y asistencia: se mantiene el encabezado accesible dentro de la tabla para evitar que genere espacio vacío fuera de la aplicación en móvil. `cd frontend && npm run test:e2e -- interfaz-global.spec.ts -g "interfaz global: (notas|asistencia) en"`: 4 pruebas aprobadas, incluidas comprobaciones de que el documento no crece fuera de la ventana en móvil.
- `git diff --check` y revisión de espacios finales de archivos nuevos: sin errores.

Las comprobaciones de tema admiten pantallas sin botón primario. El recorrido de bienvenida comprueba que los avisos informativos no interceptan los botones de tema y perfil.

Las pruebas usan la base temporal del wrapper E2E con cuentas sintéticas. No se inician servicios del backend real ni se modifican datos institucionales.

## Capturas

- [Cursos en móvil](capturas/global-cursos-oscuro-mobile.png).
- [Periodos en móvil](capturas/global-periodos-oscuro-mobile.png).
- [Estructura académica en móvil](capturas/global-estructura-oscuro-mobile.png).
- [Matrículas en móvil](capturas/global-matriculas-oscuro-mobile.png).
- [Pagos en móvil](capturas/global-pagos-oscuro-mobile.png).
- [Usuarios en móvil](capturas/global-usuarios-oscuro-mobile.png).
- [Notificaciones en móvil](capturas/global-notificaciones-oscuro-mobile.png).
- [Documentos en móvil](capturas/global-documentos-oscuro-mobile.png).
- [Alertas en móvil](capturas/global-alertas-oscuro-mobile.png).
- [Reportes en móvil](capturas/global-reportes-oscuro-mobile.png).
- [Calendario en móvil](capturas/global-calendario-oscuro-mobile.png).
- [Registro de notas en móvil](capturas/global-notas-registro-oscuro-mobile.png).
- [Registro de asistencia en móvil](capturas/global-asistencia-registro-oscuro-mobile.png).

Escritorio: [Estructura](capturas/global-estructura-oscuro-desktop.png), [Pagos](capturas/global-pagos-oscuro-desktop.png), [Calendario](capturas/global-calendario-oscuro-desktop.png) y [Asistencia](capturas/global-asistencia-oscuro-desktop.png).

La [navegación móvil](navegacion-movil.md) se simplificó posteriormente: solo barra inferior por debajo de 1024 px, sin panel lateral ni botón ☰.
