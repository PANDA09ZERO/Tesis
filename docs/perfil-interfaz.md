# Interfaz de Perfil

## Alcance

Perfil utiliza una presentación compartida para administración, profesores, alumnos, apoderados y superadministración. Se conserva la consulta de datos personales y el cambio de contraseña propio mediante las operaciones existentes del backend. No se añaden campos de edición que no tengan una operación de guardado disponible.

La cuenta administrativa dispone ahora de una página completa en `/perfil`, en lugar de la ventana breve anterior. Profesor, estudiante y apoderado conservan `/profesor/perfil`, `/estudiante/perfil` y `/familia/perfil`. Los botones de cabecera y navegación inferior abren la vista personal correspondiente; el catálogo y el menú administrativo incorporan su acceso a Mi perfil.

## Diseño

- Resumen con iniciales, nombre, correo y rol de la cuenta autenticada.
- Datos personales de consulta con etiquetas y fechas legibles. Los valores ausentes se identifican como «Sin registrar».
- Información institucional según el rol: especialidad, título e ingreso del profesor; código del alumno. No se muestran campos de docente a un apoderado.
- En móvil, accesos Mis datos y Seguridad; en escritorio, datos y seguridad en columnas.
- Negro mate y grises en modo oscuro, incluidos botones e iconos. Se conserva el modo claro.
- El perfil no muestra selectores académicos: sus datos y contraseña no dependen de un periodo. La selección global se conserva para volver a los módulos académicos.
- Estados de carga, mensajes de error, validación de respuesta y reintento. No se presenta una caché como respaldo exitoso ante una consulta fallida.

## Fuentes de datos y reglas conservadas

| Cuenta | Consulta existente |
| --- | --- |
| Administración y superadministración | `GET /auth/profile` |
| Profesor | `GET /profesores/me/perfil` |
| Alumno | `GET /estudiante/contexto`, propiedad `alumno` |
| Apoderado | `GET /auth/profile` |

Todas las consultas usan la sesión actual y sus endpoints personales. No se envía un identificador de otro usuario ni se consulta una lista de cuentas para construir el perfil. La vista del alumno ya no solicita los datos de un periodo únicamente para mostrar el perfil.

Nombre, correo y demás datos personales siguen siendo de consulta. Las correcciones se gestionan desde administración/Usuarios según las funciones existentes; para la supercuenta no se habilita una edición a través del listado del que está excluida. No se incorporaron carga de fotografías, cambios de rol ni operaciones administrativas nuevas.

## Contraseña y sesión

Se reutiliza `PUT /auth/change-password` con contraseña actual y nueva. Se conserva la política existente: mínimo de 6 caracteres, o 12 en superadministración, y máximo de 72 bytes para la nueva contraseña. Se comprueba su confirmación en el cliente; la validación y autorización definitivas siguen en el servidor.

Cada campo permite mostrar u ocultar su contenido mediante un botón con etiqueta accesible. Durante el envío se deshabilitan los campos y el botón, con una protección contra solicitudes repetidas. Ante un error se conserva el formulario y se muestra el mensaje del servidor. El éxito solo se anuncia tras la respuesta satisfactoria.

Cambiar la contraseña conserva la revocación de todas las sesiones mediante la versión de credenciales del backend. El interceptor existente descarta la sesión actual y se solicita iniciar sesión nuevamente. Cerrar sesión utiliza la operación local que ya existía; no se presenta como una revocación de otros dispositivos.

## Archivos

- `frontend/src/pages/profile/ProfilePage.tsx`: vista compartida nueva.
- `frontend/src/pages/profile/ChangePasswordForm.tsx`: formulario compartido nuevo.
- `frontend/src/pages/teachers/ProfesorPerfilPage.tsx`: reutilización de la vista compartida.
- `frontend/src/pages/students/EstudiantePage.tsx`: retirada de la implementación de perfil/contraseña duplicada; se conservan las otras vistas.
- `frontend/src/App.tsx`: integración de rutas personales y nueva ruta administrativa protegida.
- `frontend/src/components/layout/AppLayout.tsx`: acceso al perfil completo y ocultación del selector académico en esta vista.
- `frontend/src/components/layout/BottomNavigation.tsx`: estado activo del perfil administrativo.
- `frontend/src/components/layout/navigation.ts`: acceso personal administrativo en el inventario compartido.
- `frontend/src/pages/modules/ModulesPage.tsx`: descripción del acceso de perfil.
- `frontend/src/index.css`: retirada de estilos de la ventana anterior y movimiento reducido en Perfil.
- `frontend/tests/e2e/perfil-ui.spec.ts`: pruebas nuevas por rol, validación, fallos y revocación real de credenciales.
- `frontend/tests/e2e/dashboard-mobile.spec.ts`: navegación al perfil completo en lugar de la ventana anterior.

## Probar

1. Pulsar Perfil en el teléfono o el icono de cuenta de la cabecera. Comprobar nombre, correo y rol propios.
2. Alternar Mis datos y Seguridad. En escritorio, comprobar las dos columnas. Cambiar el tema y recargar.
3. Revisar los campos institucionales con un profesor y un alumno; en apoderado, comprobar que solo aparecen los datos personales.
4. Probar confirmaciones distintas de contraseña y observar el error. Un fallo del servidor conserva el formulario y permite reintentar.
5. Si se decide cambiar la contraseña de la cuenta real, usar la actual y una nueva que cumpla la política. Tras guardar, iniciar sesión nuevamente con la nueva. Esta acción cierra las sesiones anteriores.

Las pruebas automatizadas usan exclusivamente cuentas sintéticas en la base temporal E2E. La prueba de cambio real de contraseña restaura al terminar la contraseña de su cuenta de prueba. No se modifican credenciales institucionales, tablas, endpoints ni reglas de negocio.

## Validación

- `cd frontend && npm run build`: correcto. Se conserva la advertencia de Vite sobre el tamaño del paquete principal.
- `cd frontend && npm run test:e2e`: 82 pruebas aprobadas y 2 omitidas (casos exclusivos de móvil en el proyecto de escritorio).
- `cd frontend && npm run test:e2e -- perfil-ui.spec.ts -g "vista adaptable de Administrador"`: 2 pruebas aprobadas; capturas con animaciones deshabilitadas para evitar colores durante la transición de tema.
- `git diff --check` sobre los archivos de esta implementación: sin errores.

Las pruebas cubren los cinco roles, escritorio/móvil, datos propios, navegación, modo claro/oscuro, carga y reintento, validación de contraseña, errores del servidor, protección frente a envíos duplicados y revocación de sesiones tras un cambio real en la base temporal.

## Capturas

- [Perfil claro en móvil](capturas/perfil-claro-mobile.png).
- [Perfil oscuro en móvil](capturas/perfil-oscuro-mobile.png).
- [Seguridad en móvil](capturas/perfil-seguridad-mobile.png).
- [Perfil oscuro en escritorio](capturas/perfil-oscuro-desktop.png).
