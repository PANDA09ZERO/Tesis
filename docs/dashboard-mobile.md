# Dashboard adaptable y navegación móvil

## Alcance de esta etapa

Se adaptó el dashboard administrativo a las referencias móviles: cabecera compacta, saludo, cuatro indicadores, accesos rápidos, actividad reciente y navegación inferior. El escritorio conserva su distribución administrativa con menú lateral, indicadores y gráficos. Los paneles personales de profesor, estudiante y apoderado mantienen sus datos y funciones; la navegación compartida utiliza sus rutas autorizadas.

Esta es la primera etapa solicitada en el texto adjunto. La adaptación individual de formularios, tablas y demás módulos queda para una siguiente revisión del diseño. No se agregaron módulos, tablas, dependencias ni endpoints.

## Componentes y datos existentes

Antes de modificar la vista se revisaron AppLayout, Sidebar, BottomNavigation, ThemeContext, PeriodoContext, DashboardPage, los endpoints de dashboard/matrículas/periodos y las rutas por rol.

- Con un periodo seleccionado, las tarjetas móviles utilizan el resumen existente de `GET /periodos/:id`: alumnos activos, profesores, inscripciones y cursos de ese periodo.
- Sin periodo seleccionado, utilizan las estadísticas generales existentes de dashboard y matrículas. La cabecera indica «Visión general».
- «Matrículas» identifica explícitamente «Inscripciones por curso»: el modelo y el endpoint cuentan relaciones alumno/curso, no alumnos únicos ni pagos de matrícula.
- La actividad usa `accion`, `entidad`, actor y `created_at` reales. Se identifica como general del sistema porque su API no atribuye todos los eventos a un periodo. Una lista vacía muestra su estado vacío.
- Grados abre Estructura académica; los demás accesos abren Cursos, Horarios, Asistencia, Calificaciones y Periodos. No existe un módulo independiente de Secciones y no se creó uno para copiar la imagen.
- Los errores del servidor se muestran con una acción de reintento. Las respuestas tardías de un periodo anterior no reemplazan la selección actual.

## Navegación y tema

El administrador tiene Inicio, Módulos, Horarios, Reportes y Perfil. En teléfono solo se utiliza la barra inferior: Módulos abre el catálogo de accesos. El menú vertical se reserva para escritorio y ya no existe el botón ☰. Consulta [la adaptación de Módulos](modulos-interfaz.md). Perfil abre ahora la [página personal completa](perfil-interfaz.md), con datos de consulta y seguridad.

Profesor y estudiante tienen Inicio, Módulos, Horarios, Notas y Perfil, con sus rutas existentes. El apoderado tiene Inicio, Módulos y Perfil, sin accesos a reportes administrativos. Se conservan las comprobaciones de permisos del servidor.

El modo inicial es claro. El botón de luna/sol activa el modo oscuro y guarda la elección localmente; no depende del tema del sistema operativo. Se reutilizan las clases y componentes del proyecto. La variante oscura de Tailwind 4 se vincula explícitamente a la clase `dark`.

La barra inferior se muestra por debajo de 1024 px, incluido Perfil; el menú lateral solo se muestra desde 1024 px. Se reserva espacio inferior, incluida el área segura del dispositivo, también en tabletas. Los controles principales tienen una superficie táctil mínima de 44 px. Cerrar sesión en teléfono está disponible en Perfil → Seguridad. El dashboard y la barra respetan la preferencia de movimiento reducido.

## Archivos de esta etapa

- `frontend/src/pages/dashboard/MobileDashboard.tsx`: composición móvil y datos reales.
- `frontend/src/pages/dashboard/DashboardPage.tsx`: carga por ámbito y conservación del escritorio.
- `frontend/src/components/layout/AppLayout.tsx`: cabecera, tema, cuenta y espaciado.
- `frontend/src/components/layout/BottomNavigation.tsx`: accesos según rol.
- `frontend/src/components/layout/Sidebar.tsx`: contraste en modo oscuro.
- `frontend/src/context/NavigationContext.tsx`: apertura compartida del menú y perfil.
- `frontend/src/context/ThemeContext.tsx`: preferencia opcional persistente.
- `frontend/src/components/ui/Modal.tsx`: clase opcional para la superficie del perfil.
- `frontend/src/index.css`: variante oscura y ajustes acotados de accesibilidad.
- `frontend/tests/e2e/dashboard-mobile.spec.ts`: diseño, datos, permisos, errores y cambios de periodo.
- `frontend/tests/e2e/familia.spec.ts` y `periodo-detalle.spec.ts`: aserciones para la representación existente en tarjetas móviles y tablas de escritorio.
- `frontend/scripts/test-e2e.cjs`: permite los inicios repetidos de la suite únicamente en el proceso sintético; conserva el límite del servidor real.

## Capturas de revisión

Capturas con datos sintéticos de la prueba automática: [tema claro](capturas/dashboard-mobile-claro.png) y [tema oscuro](capturas/dashboard-mobile-oscuro.png).

## Probar en el teléfono

1. Con MySQL iniciado, abrir dos terminales: ejecutar `npm run dev` en `C:/xampp/htdocs/Tesis/backend` y `npm run dev` en `C:/xampp/htdocs/Tesis/frontend`. El backend local usa el puerto 3000 y el frontend, el 5173.
2. Conectar computadora y teléfono a la misma red. Abrir `http://IP-DE-TU-PC:5173` desde el teléfono; `localhost` en el teléfono apunta al propio teléfono.
3. Entrar con una cuenta propia de administrador y abrir Inicio. Cambiar el periodo y comprobar las tarjetas, entrar en los accesos y abrir Módulos.
4. Usar el botón de luna/sol, recargar y comprobar que conserva el tema. Deslizar hasta Actividad reciente y comprobar que la barra inferior permite ver el final.
5. Repetir con las cuentas personales para comprobar sus accesos. En escritorio, comprobar que permanecen el menú lateral y los gráficos.

El servidor Vite ya escucha en la red y conserva el proxy existente al backend. No se cambiaron puertos, credenciales, CORS ni reglas del firewall para esta etapa. Las pruebas automatizadas utilizan una base sintética aislada; los números de sus capturas no son datos institucionales.

### Instalar como aplicación web (PWA)

La instalación requiere abrir la aplicación publicada mediante HTTPS; la URL HTTP de desarrollo en la red local sirve para revisar la interfaz, pero no para instalarla en el teléfono. Después de desplegar una compilación actualizada:

- **Android:** abrir la URL HTTPS en Chrome y elegir **Instalar aplicación** o **Añadir a pantalla de inicio** en el menú del navegador.
- **iPhone/iPad:** abrir la URL HTTPS en Safari, tocar **Compartir** y elegir **Añadir a pantalla de inicio**.

La instalación no hace que toda la plataforma funcione sin internet: los datos académicos y las operaciones siguen necesitando conexión al backend, y no se guardan respuestas de la API en caché.

## Validación

Ejecutados desde `frontend`:

- `npm run build`: correcto (TypeScript y Vite). Persiste el aviso de tamaño del bundle principal, aproximadamente 950 kB sin comprimir; no impide la compilación.
- `npm run test:session`: 6 pruebas aprobadas.
- `npm run test:e2e -- dashboard-mobile.spec.ts`: 5 aprobadas y 1 omitida, por tratarse de navegación exclusiva de móvil en el proyecto de escritorio.
- `npm run test:e2e`: resultado final de 45 aprobadas y 1 omitida, en escritorio Chromium y emulación Pixel 7. Incluye comprobaciones adicionales a 320 y 768 px, datos del periodo, navegación por rol, persistencia del tema, errores y respuestas tardías.
- `node --check scripts/test-e2e.cjs`: correcto.

La revisión `git diff --check` de los archivos rastreados modificados en esta etapa pasó. La comprobación global detectó una línea vacía al final de `backend/src/controllers/horarios.controller.ts`, ajena a este cambio; no se modificó ese controlador.

Se inspeccionaron las capturas de móvil en ambos temas y de escritorio. No se modificaron datos de la base institucional ni se publicaron cambios en un hosting. La ampliación del límite de intentos solo se aplica al proceso aislado E2E; las pruebas de autenticación y permisos continúan usando las operaciones reales del backend.


### Ajuste de paleta oscura (24/10/2026)

Los fondos oscuros utilizan negro mate (#101010), carbón (#1b1b1b) y gris (#262626), con bordes neutros. Se ajustan las variables de gris/slate únicamente dentro de `.dark`, incluyendo cabecera, panel, tarjetas, navegación y perfil. También los botones, iconos, selección y estados de interacción usan grises neutros en modo oscuro; el tema claro conserva su azul original. La selección del menú utiliza un fondo gris. Las capturas de la primera revisión anteriores a este ajuste no representan esta nueva paleta.
