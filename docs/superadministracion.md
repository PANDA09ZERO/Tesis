# Superadministración y control operativo

Implementado el 21/10/2026. El propietario autorizó una supercuenta fuera de la gestión habitual de Usuarios y confirmó que «inhabilitar» significa suspender el sistema completo de forma reversible.

## Cuenta e ingreso

Se reutilizan `roles`, `usuarios`, bcrypt, JWT y `registro_actividades`. No hay contraseña maestra, acceso anónimo ni cuenta predeterminada. La consola de aprovisionamiento crea el rol por nombre y permite una sola supercuenta; no depende de un ID de rol fijo y no necesita DDL nuevo. El propietario indicó expresamente los datos de su cuenta: se preparó ese registro inactivo, con una credencial aleatoria no entregada ni utilizable para ingresar mientras siga inactivo. Falta que su propietario defina la contraseña por consola y lo active. No se modificaron cuentas habituales.

Desde una terminal privada del operador:

```powershell
Set-Location C:\xampp\htdocs\Tesis\backend
npm run superadmin:bootstrap
```

Solicita correo, nombre, apellido y contraseña repetida. La contraseña no se muestra ni se pasa como argumento; requiere al menos 12 caracteres y como máximo 72 bytes. No guardarla en Git ni compartirla por chat. La terminal debe ser interactiva. La conexión usa las variables del backend; en producción los secretos se suministran por el entorno, sin cargar `.env` local.

Si la cuenta ya está preparada, usar `npm run superadmin:bootstrap -- activate`: pide correo y nueva contraseña repetida. No ejecutar `create` de nuevo. Después, iniciar sesión en el login habitual y abrir **Control del sistema**, ruta `/superadministracion`. Se conserva el acceso a la gestión administrativa normal. Internamente se mantiene el rol real `superadministrador` en BD/token/perfil; las pantallas y controladores académicos reutilizan el alcance de administrador. Esta adaptación de interfaz nunca concede autorización por sí sola.

La cuenta queda excluida de listado, búsqueda, total y consulta individual de Usuarios. Tampoco puede editarse o desactivarse mediante esos endpoints, incluso conociendo su ID. Las altas ordinarias no pueden asignar el rol privilegiado. La supercuenta sí consta en la auditoría; no se pretende ocultar su existencia al propietario u operador de la base.

## Funciones

- Suspender y reactivar el acceso habitual sin eliminar datos.
- Crear una copia de MySQL y los archivos privados del módulo general de documentos.
- Descargar el conjunto como `.tar.gz` autenticado.
- Recuperarlo y verificarlo en una base y directorio aislados y vacíos, configurados por el operador.
- Consultar los últimos 100 eventos operativos y cambiar la contraseña propia.
- Administrar usuarios normales y los módulos existentes mediante los permisos administrativos reutilizados.

Cada operación sensible comprueba nuevamente la contraseña. Hay limitación de intentos, exclusión de operaciones simultáneas y auditoría de inicio/resultado. Las rutas de control exigen el rol real en backend; un administrador ordinario no puede utilizarlas.

## Suspensión persistente

El estado se guarda en el diario privado `suspension.jsonl`, dentro de `OPERATIONS_DIRECTORY`. Sobrevive al reinicio siempre que se conserve ese volumen. La suspensión bloquea solicitudes habituales y nuevos logins de las otras cuentas con HTTP 503 y código `SYSTEM_SUSPENDED`; también alcanza sesiones ya iniciadas en su siguiente solicitud. La interfaz muestra un aviso y permite reintentar o cerrar sesión. Los datos que ya estaban dibujados en un navegador no pueden retirarse remotamente mientras esté desconectado.

El superadministrador mantiene ingreso y control para reactivar. Se conserva la consulta autenticada del perfil propio y la salud técnica pública. La suspensión no detiene el proceso ni el hosting, ni cambia por sí sola el estado de cuentas individuales. Durante una operación exclusiva también se bloquean temporalmente solicitudes habituales, incluidas las administrativas; no se puede seguir escribiendo desde otro panel mientras se genera una copia.

La ausencia de configuración operativa en producción conserva la aplicación anterior pero deja el panel inhabilitado. Una vez configurada, un diario ausente/corrupto o inaccesible no se interpreta como autorización para reabrir el servicio. El aprovisionamiento inicializa el diario sin sobrescribir un estado existente. Montar el volumen antes de aprovisionar/arrancar.

## Configuración del alojamiento

Valores de ejemplo, no rutas ni credenciales del destino real:

```dotenv
# Ruta absoluta en almacenamiento privado persistente y separada de uploads.
OPERATIONS_DIRECTORY=/data/operations
# Activar solo tras verificar UNA instancia de API y detener escritores externos/jobs.
OPERATIONS_SINGLE_INSTANCE=false
# Otra base vacía, ya creada en el mismo servidor MySQL.
RECOVERY_DB_NAME=gestion_recuperacion
# Otro directorio vacío, separado de uploads y de operations.
RECOVERY_UPLOAD_DIRECTORY=/data/recovery-uploads
```

En desarrollo, el almacén predeterminado es `backend/var/operations`, ignorado por Git. Los respaldos se ubican en su subdirectorio `backups`. No se sirve ninguno de estos directorios como contenido público. Revisar permisos del volumen y ACL de Windows: chmod no sustituye una ACL apropiada.

La API permite crear/recuperar copias solo con el sistema suspendido y `OPERATIONS_SINGLE_INSTANCE=true`. La bandera es una declaración del operador: no descubre automáticamente otras réplicas ni detiene procesos externos. Primero confirmar una sola instancia y detener cualquier otro escritor; un despliegue horizontal necesita coordinación adicional y no queda autorizado por cambiar esa variable.

Se esperan las solicitudes en curso antes de respaldar. Si una escritura HTTP se desconectó antes de completarse, se rechaza la copia hasta revisar y reiniciar la API suspendida. No se continúa suponiendo que dejó de escribir. Con el panel configurado, readiness verifica acceso al almacén sin crear archivos temporales dentro de uploads durante el respaldo.

Se necesitan `mysql` y `mysqldump` compatibles. En Windows, los ensayos utilizaron MySQL Server 8.0 y las variables `MYSQL_BIN`/`MYSQLDUMP_BIN`. La imagen Docker incorpora `default-mysql-client` y `MYSQL_CLIENT_FLAVOR=mariadb`; su construcción y compatibilidad en el alojamiento todavía deben verificarse allí. La aplicación sigue usando MySQL como base de datos; el cliente de consola no cambia el motor del servidor.

## Respaldos y recuperación

Se reutiliza `backend/scripts/backup.cjs`: inventario, referencias, SHA-256, SQL, archivos y conteos. Las copias incompletas no se ofrecen como respaldos terminados. La descarga requiere contraseña vigente y conserva auditoría.

El archivo comprimido **no está cifrado**. Contiene información personal; proteger el volumen, las descargas y cualquier copia externa con cifrado y controles institucionales. El código y la configuración del alojamiento se recuperan desde la versión del repositorio y el gestor de secretos; este archivo no es una imagen completa del servidor ni incluye una exportación de secretos del entorno.

Para recuperar, elegir una copia, confirmar la contraseña y escribir `RECUPERAR EN DESTINO AISLADO`. El backend utiliza exclusivamente los destinos del entorno; el navegador no elige rutas arbitrarias, comandos, credenciales o bases. Se rechaza la base en uso, directorios solapados y destinos ocupados. La recuperación no cambia automáticamente la conexión del sistema ni sobrescribe producción.

Una recuperación que falla puede dejar un destino parcial. Conservar el origen; revisar y preparar otro destino vacío antes de reintentar. El cambio final de la aplicación hacia un destino recuperado exige el procedimiento de mantenimiento, verificación y publicación autorizado en `operacion-produccion.md`, incluida revisión de las cuentas recuperadas y rotación del secreto de sesiones para no revalidar tokens antiguos del momento del respaldo.

No se añadieron purgas ni programación periódica. Frecuencia, conservación, destino cifrado externo, responsables y RPO/RTO siguen requiriendo definición institucional.

## Recuperación de acceso por consola

Para no depender de Usuarios ni de una sesión válida, el operador del servidor puede ejecutar:

```powershell
npm run superadmin:bootstrap -- reset-password
npm run superadmin:bootstrap -- deactivate
npm run superadmin:bootstrap -- activate
```

Los comandos piden el correo y, cuando corresponde, la nueva contraseña repetida. Desactivar bloquea el acceso y reemplaza la credencial por una aleatoria no entregada, invalidando las sesiones vigentes. Activar exige definir una contraseña nueva; no resucita tokens anteriores. Restablecer contraseña también invalida todas las sesiones. No ejecutar estos comandos mientras otra operación de copia/recuperación esté activa: son escrituras externas al circuito HTTP.

Tras un corte abrupto puede quedar `operation.lock`. No se elimina automáticamente ni se fuerza desde el navegador: podría existir una copia o restauración todavía en ejecución. El operador debe detener la API y otros escritores, confirmar que finalizaron sus clientes MySQL, revisar los destinos parciales y el diario, preservar la suspensión, y retirar únicamente ese archivo de bloqueo dentro del almacén privado verificado. Luego reiniciar, comprobar estado/auditoría y reactivar desde el panel cuando corresponda. Nunca borrar el diario, uploads o respaldos para solucionar un bloqueo.

## Archivos y pruebas

Backend: controlador y rutas de `superadministracion`, utilidades `operations`, integración en app/login/health/permisos, exclusión del rol en Usuarios, `bootstrap-superadmin.cjs`, dependencia `tar`, Docker y variables de ejemplo. Frontend: `SuperadministracionPage`, `SystemSuspended`, adaptación verificada de sesión, ruta, Sidebar y manejo del 503. También se actualizaron CI, ejecutor de pruebas, fixture sintético y documentación.

```bash
# Backend
npm run test:all
npm run test:superadmin
npm run test:production
# Frontend
npm run build
npm run test:session
npm run test:e2e
```

Las pruebas utilizan bases y archivos temporales sintéticos, con limpieza controlada. Comprueban rol real, exclusión en Usuarios, rechazo de escalada/IDs, suspensión de sesiones/login/escrituras, persistencia, bloqueo concurrente, copia SQL/archivos, descarga protegida, recuperación aislada, auditoría y recuperación de acceso. El navegador comprueba el panel en escritorio y vista móvil.

Validación local del 21/10/2026: suite completa backend aprobada; las comprobaciones finales de superadministración pasaron 10 casos (11 entradas Node contando su contenedor), incluida la ausencia de escrituras concurrentes durante el bloqueo. También pasaron las pruebas de producción, la compilación frontend, 6 pruebas de sesión y las 20 pruebas de navegador; se repitieron las 2 del panel tras los ajustes de interfaz. Se revisaron capturas de escritorio/móvil y `git diff --check`. Persiste el aviso de Vite por paquete principal superior a 500 kB. No se construyó Docker ni se probó un alojamiento público en esta entrega.

La única escritura autorizada en la instalación existente fue preparar la supercuenta nominal inactiva, su rol/auditoría y el estado inicial del panel. No se suspendió la instalación ni se copiaron/restauraron sus datos. Antes de usar las funciones operativas en producción, verificar volumen, clientes MySQL, instancia única y recuperación en el alojamiento elegido.

Corrección del asistente de activación (21/10/2026): la lectura de contraseñas usa una salida privada con APIs públicas de readline, sin modificar métodos internos. Se verificó la secuencia correo/contraseña/repetición con CRLF de Windows y la cancelación con Ctrl+C. Los errores de entrada, validación y conexión muestran mensajes específicos sin exponer SQL ni credenciales. La activación compara el correo sin distinguir mayúsculas. Esperar cada pregunta; la contraseña se escribe aunque no aparezcan caracteres en pantalla.
