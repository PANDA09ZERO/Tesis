# Interfaz de Módulos

## Comportamiento

Módulos tiene ahora una pantalla propia en `/modulos`. Se abre desde el botón inferior en teléfono y desde el menú lateral o «Ver todos» en escritorio. No hay menú lateral ni botón ☰ en teléfono.

El catálogo presenta los accesos de la cuenta en tarjetas adaptables, con icono, nombre y descripción. Incluye búsqueda inmediata por nombre, categoría y descripción, sin distinguir tildes o mayúsculas, contador de accesos visibles y estado vacío con una acción para mostrar todos.

En administración se reutilizan Institución y Académico, además de Gestión y herramientas para los accesos restantes. Las otras cuentas utilizan sus accesos personales. Los colores oscuros son negro mate y grises, incluidos controles e iconos; el modo claro conserva sus colores.

## Permisos e inventario compartido

`navigation.ts` contiene la lista que ya utilizaba Sidebar. Tanto el menú como el catálogo consultan esta misma lista según el rol autenticado; no hay un segundo inventario de permisos ni se duplican páginas de negocio.

- Administrador: accesos institucionales existentes.
- Profesor: sus alumnos, cursos, horarios y herramientas ya disponibles.
- Alumno: sus consultas personales existentes.
- Apoderado: solo perfil y estudiantes vinculados; no documentos ni pagos.
- Superadministrador: además, Control del sistema mediante su ruta protegida existente.

El catálogo no se incluye como tarjeta de sí mismo y no repite destinos. Los roles desconocidos no reciben un menú de respaldo. Las autorizaciones del backend permanecen vigentes; ocultar un enlace no concede ni reemplaza permisos.

Se añadió únicamente la ruta frontend protegida de Módulos a los accesos permitidos de cada rol. No se añadieron APIs, tablas, migraciones ni reglas de negocio. La búsqueda usa metadatos de navegación y su contador mide enlaces, no registros académicos.

El menú lateral solo aparece en escritorio, conservando navegación, grupos desplegables y cierre de sesión. En teléfono, los accesos se consultan desde Módulos y se cierra sesión desde Perfil → Seguridad. El botón inferior Módulos marca su estado activo al visitar el catálogo. Las tarjetas son enlaces nativos, con foco de teclado y un área táctil amplia.

## Archivos

- `frontend/src/pages/modules/ModulesPage.tsx`: catálogo nuevo.
- `frontend/src/components/layout/navigation.ts`: inventario compartido extraído del menú existente.
- `frontend/src/components/layout/Sidebar.tsx`: reutilización del inventario y acceso al catálogo.
- `frontend/src/components/layout/AppLayout.tsx`: utiliza exclusivamente la barra inferior en teléfono y el menú lateral en escritorio.
- `frontend/src/components/layout/BottomNavigation.tsx`: ruta y estado activo de Módulos.
- `frontend/src/pages/dashboard/DashboardPage.tsx`: «Ver todos» de escritorio abre el catálogo.
- `frontend/src/App.tsx`: ruta protegida y autorización frontend para los cuatro roles operativos.
- `frontend/tests/e2e/modulos-ui.spec.ts`: pruebas nuevas por rol, búsqueda, tamaños y navegación.
- `frontend/tests/e2e/dashboard-mobile.spec.ts`: las pruebas del diálogo usan el botón de menú; Módulos se verifica como pantalla propia.

## Probar

1. Abrir el sistema con una cuenta propia y pulsar Módulos. En escritorio también se puede usar «Ver todos» del dashboard.
2. Buscar «estructura academica», con o sin tildes. Comprobar el estado vacío con una búsqueda sin coincidencias y usar Mostrar todos.
3. Abrir un acceso y comprobar su función habitual. Recargar `/modulos` para verificar la restauración de sesión y el alcance de la cuenta.
4. Cambiar de tema. En teléfono, comprobar que no hay botón ☰ ni menú vertical y que Módulos abre el catálogo desde la barra inferior. Al ampliar a 1024 px, comprobar que aparece el lateral y se oculta la barra inferior.
5. Comprobar los perfiles personales: el apoderado solo muestra sus dos accesos y las otras cuentas no ofrecen administración ni control del sistema.

## Validación

- `npm run build` (frontend): correcto. Persiste el aviso de tamaño del bundle, aproximadamente 965 kB sin comprimir.
- `npm run test:e2e -- modulos-ui.spec.ts dashboard-mobile.spec.ts`: 16 aprobadas y 2 omitidas por ser exclusivas de móvil en el proyecto de escritorio.
- `npm run test:e2e`: resultado final de 66 aprobadas y 2 omitidas, en escritorio Chromium y móvil Pixel 7. Incluye Alumnos, asignaciones, calificaciones, dashboard, familia, periodos, roles y superadministración, además del nuevo catálogo.
- `git diff --check` de los archivos rastreados de esta etapa: correcto.

Se inspeccionaron capturas de escritorio y móvil en claro/oscuro. Las pruebas del catálogo verifican búsqueda, enlaces únicos, ausencia de accesos ajenos, recarga y navegación de cinco tipos de cuenta, además de anchuras móviles, espacio bajo la barra inferior y acceso al catálogo con teclado. La revisión de navegación añade comprobaciones de los límites 1023/1024 px.

### Capturas con cuentas de prueba

- [Móvil claro](capturas/modulos-claro-mobile.png)
- [Móvil oscuro](capturas/modulos-oscuro-mobile.png)
- [Escritorio claro](capturas/modulos-claro-desktop.png)
- [Escritorio oscuro](capturas/modulos-oscuro-desktop.png)
 Las pruebas emplean cuentas y base sintéticas aisladas, sin modificar los datos institucionales ni iniciar servicios locales adicionales fuera del wrapper E2E.
