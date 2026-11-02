# Operación y despliegue institucional

Desde el 21/10/2026 existe un panel de superadministración para suspensión reversible, respaldos y recuperación aislada. Revisar [aprovisionamiento y almacenamiento operativo](superadministracion.md) antes de habilitarlo. No reemplaza los requisitos de volumen persistente, instancia única, respaldo protegido ni las decisiones institucionales pendientes.

Actualizado: 15/10/2026. Destino preparado: React/Vite en Vercel; Express y MySQL en Railway; documentos en volumen privado. Estado y comprobaciones: [estado-produccion.md](estado-produccion.md). No se han contratado servicios ni trasladado datos reales.

## 1. Antes de crear servicios

El propietario confirmó uso institucional con datos reales y que dispone de Vercel. Falta crear/autorizar Railway, acordar presupuesto, dominio, región, capacidad, responsable de mantenimiento y recuperación. Separar preproducción y producción con bases, archivos, cuentas y secretos diferentes. Los previews no deben acceder a producción.

No abrir acceso institucional hasta cerrar la lista de salida del plan. Los datos actuales requieren revisión de cuentas heredadas/demo y de la estructura antes de importarlos. El `.env` raíz salió del índice Git y se conserva localmente; sigue existiendo en tres commits del historial. No se ha reescrito ese historial ni rotado credenciales de proveedores o de MySQL. Revocar/rotar cualquier secreto que se hubiera compartido y coordinar con colaboradores antes de limpiar historia remota. La clave JWT local fue generada de nuevo: las sesiones locales anteriores deben iniciar sesión otra vez.

## 2. Backend en Railway

1. Crear proyecto y entornos separados, MySQL y servicio backend. Revisar costo y región antes de confirmar la contratación.
2. Para este Dockerfile, usar **la raíz del repositorio** como contexto, `railway.json` como configuración y `backend/Dockerfile` como Dockerfile. No configurar Root Directory `backend`: el build copia también `database` desde la raíz. No hay migraciones automáticas en el arranque/predeploy.
3. Configurar Node 24; Docker lo fija en las etapas de compilación y ejecución. El arranque ejecuta `dist/server.js` y atiende `PORT` del proveedor en `0.0.0.0`. La imagen ejecuta la API como usuario `node`, UID 1000.
4. Crear un volumen del backend separado del de MySQL, montado exactamente en `/data/uploads`. Preparar esa ruta montada con propietario UID/GID 1000 y permisos de lectura/escritura apropiados, mediante una operación administrativa controlada sobre ese volumen. La API no corre como root para reparar permisos ni crea una ruta alternativa si falta el volumen en producción. Verificar escritura/lectura con el mismo UID antes de abrir tráfico. No fijar `RAILWAY_RUN_UID=0` como solución permanente sin revisión.
5. Configurar variables de la tabla siguiente en Railway, sin archivos `.env` ni secretos en Git. Mantener una sola instancia. El limitador de login es por proceso y el almacenamiento es local al volumen; no escalar réplicas con esta configuración.
6. Crear base vacía mediante la cuenta de administración/DDL. Instalar, revisar y crear el primer administrador desde una sesión operativa privada, con las herramientas de la sección 4. No usar seeds.
7. Cambiar las credenciales de la API por un usuario con permisos limitados sobre su base. Probar transacciones, `FOR UPDATE`, `GET_LOCK`, lecturas de metadatos y descargas con ese usuario. No guardar credenciales de DDL en el servicio API.
8. Habilitar dominio HTTPS para la API. El healthcheck de despliegue está en `/api/ready`; `/api/health` solo comprueba el proceso. Confirmar recuperación tras reinicio/redeploy, subida/descarga de 10 MB y checksum del archivo en el alojamiento real.

| Variable | Configuración requerida |
|---|---|
| `NODE_ENV` | `production` exacto; no se cargan `.env` locales |
| `JWT_SECRET` | Aleatorio, distinto por entorno, mínimo 48 caracteres; generar 48 bytes criptográficos y guardar su representación hexadecimal directamente en el gestor de secretos |
| `JWT_EXPIRES_IN` | Regla existente: `24h` por defecto; revisar política institucional si se quiere modificar |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Base del entorno, preferentemente en la red privada del proveedor |
| `DB_USER`, `DB_PASSWORD` | Usuario exclusivo limitado, no `root`, contraseña no vacía |
| `DB_SSL` | `true` con certificado verificado en conexión externa; `false` solo si se ha verificado que el enlace es privado según la arquitectura aprobada |
| `DB_SSL_CA_FILE` | Opcional: archivo CA confiable accesible al servicio; no desactivar verificación TLS |
| `CORS_ORIGINS` | Orígenes HTTPS exactos de Vercel/dominio, separados por comas; sin rutas, `*` ni comodines para previews |
| `UPLOAD_DIRECTORY` | `/data/uploads`, volumen privado montado y escribible |
| `TRUST_PROXY` | IP/CIDR de proxies comprobados; vacío ignora cabeceras de IP del cliente. No adivinar el número de saltos ni usar `true`, `1` o todas las redes |
| `DB_CONNECTION_LIMIT` / `DB_QUEUE_LIMIT` | Valores iniciales 10 / 100, ajustar mediante medición y límites del servicio |
| `DB_CONNECT_TIMEOUT_MS` | 10000 por defecto |
| `READINESS_TIMEOUT_MS` | 3000 por defecto, comprobar frente a la red real |
| `REQUEST_TIMEOUT_MS` | 120000 por defecto |
| `MAX_UPLOAD_BYTES` | 10485760, mantener 10 MB salvo cambio autorizado |
| `ENABLE_DEMO_SEED` | `false`; producción los bloquea aun si se envía `true` |

Con `TRUST_PROXY` vacío, varios usuarios detrás de Railway pueden compartir el contador por IP. Antes de publicar, comprobar la cadena real del proxy y que el último proxy confiable sobrescribe cabeceras del cliente. Probar dos IP reales y un `X-Forwarded-For` falsificado. No establecer una red amplia solo para que pase la prueba. Límite actual: 20 intentos por cuenta/IP y 100 por IP cada 15 minutos; es memoria del proceso y se reinicia al reiniciar el servicio. Para más instancias o resistencia a reinicios, implementar un contador compartido antes de escalar.

Railway documenta restricciones de réplicas con volúmenes y un breve corte al redesplegar un servicio con volumen. La imagen y esos permisos aún deben ensayarse en Railway. [Configuración como código](https://docs.railway.com/config-as-code/reference), [volúmenes y permisos](https://docs.railway.com/volumes/reference).

## 3. Frontend en Vercel

1. Importar el repositorio, Root Directory `frontend`, framework Vite, Node 24, instalación `npm ci --include=dev`, build `npm run build`, salida `dist`.
2. Definir `VITE_API_BASE_URL=https://DOMINIO-REAL-API/api`, sustituyendo el marcador por la URL real del entorno. Es pública; nunca colocar JWT, contraseñas, datos MySQL ni credenciales de almacenamiento en variables `VITE_*`.
3. Configurar en backend el origen exacto del frontend. Configurar Preview y Production por separado. La URL se incorpora al compilar: cambiar una variable exige reconstruir el frontend.
4. `frontend/vercel.json` mantiene las rutas SPA. Esta implementación eligió **API HTTPS directa**, sin rewrite/proxy API de Vercel. Authorization y los documentos viajan al backend usando el mismo cliente Axios; `/api` relativo se conserva únicamente para desarrollo con proxy Vite.
5. Verificar abrir/recargar `/dashboard`, `/admin/pagos`, un detalle de curso/alumno y las rutas personales; confirmar que assets responden como JS/CSS. Probar sesión, cambios de contraseña, CORS, errores, descargas autenticadas y archivos de 10 MB en escritorio y móvil.
6. Confirmar plan comercial/institucional permitido y costos con el propietario. No se promete un plan gratuito. El build falla en Vercel si falta la URL pública de API.

Se actualizó Vite 7, Router 7 y Tailwind 4 para resolver avisos de seguridad. Se conservaron React 18, componentes, colores primarios y utilidades de compatibilidad; se adaptaron nombres de utilidades. Tailwind 4 necesita navegadores modernos: Safari 16.4+, Chrome 111+, Firefox 128+. Comprobar los dispositivos institucionales; las pruebas locales usan Chromium y un viewport móvil, no certifican Safari ni Firefox. [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite), [guía de Tailwind](https://tailwindcss.com/docs/upgrade-guide).

## 4. Instalación, actualización y cuentas

Desde `backend`, con variables del destino privado ya configuradas y Node 24:

```bash
npm ci --include=dev
npm run build
# Únicamente una base nueva, vacía y ya creada:
npm run db:install -- --empty-database-confirmed
# ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL, ADMIN_PASSWORD:
# proporcionar por entorno de sesión/gestor, sin argumentos ni historial de comandos.
npm run admin:bootstrap
npm run production:check
```

El bootstrap no tiene contraseña por defecto y se niega si ya existe un administrador. Eliminar la variable ADMIN_PASSWORD de la sesión al terminar. La imagen runtime no incluye clientes MySQL de respaldo; usar una estación/servicio de operación protegido para esos comandos.

Para base existente: ver [database/migrations/README.md](../database/migrations/README.md). Primero respaldo restaurable, comparación de estructura y conteos; después migraciones concretas revisadas. No ejecutar toda la carpeta SQL ni reinstalar schema.sql sobre datos.

```bash
npm run db:check
# Solo inspección, sin escrituras:
npm run migrate:production
# Después de verificar respaldo/restauración y detener escrituras del destino:
npm run migrate:production -- --apply --backup-confirmed --maintenance-confirmed
# Tras comparar tipos, FKs, nulabilidad y demás diferencias manualmente:
npm run db:baseline -- --backup-confirmed --schema-reviewed
npm run production:check
```

La migración del índice único de sueldos rechaza grupos duplicados: no fusiona, borra ni cambia importes históricos. La instalación limpia ya incluye el índice. Si una migración DDL falla, detenerse e inspeccionar: MySQL hace commits implícitos; rollback de código no revierte DDL. `db:check` verifica columnas y claves únicas críticas, no sustituye una comparación completa de estructuras.

Producción solo autentica bcrypt. Las tres cuentas activas locales con formato heredado requieren identificar a sus propietarios y restablecer su contraseña mediante la administración autorizada antes de trasladarlas, o desactivarlas si corresponde. Revisar las cuatro cuentas con correos demo conocidos; no se desactivaron por inferencia. No convertir texto reversible a bcrypt automáticamente para legitimar contraseñas inseguras. Las altas personales de alumno/apoderado/usuario requieren contraseña explícita, mínimo existente de 6 caracteres y máximo bcrypt de 72 bytes. No se inventó una política institucional nueva de complejidad, caducidad o entrega de credenciales.

Archivar documentos conserva referencia, bytes e historial. No hay purgas. En producción, DELETE de matrícula responde 409 explicando que se puede cancelar sin borrar historial. La política definitiva de conservación, restauración de archivos archivados y borrado está pendiente de la institución.

## 5. Respaldo y restauración

Usar `mysql` y `mysqldump` compatibles con la autenticación/versiones del servidor. En esta estación, el cliente MariaDB de XAMPP no admitió `caching_sha2_password`; se verificó con MySQL 8.0. Si no están en PATH, configurar `MYSQL_BIN` y `MYSQLDUMP_BIN` con rutas absolutas. Para clientes MariaDB compatibles establecer `MYSQL_CLIENT_FLAVOR=mariadb`; MySQL es el valor por defecto. Los clientes se ejecutan sin shell, con credenciales en archivo temporal privado, retirado al terminar; no se colocan contraseñas en argv.

El respaldo contiene datos personales en SQL y archivos: **no está cifrado por esta herramienta**. Guardarlo en un destino con acceso institucional restringido y cifrado apropiado; en Windows revisar ACL, pues chmod no equivale a una ACL privada. El gestor del proveedor y las copias fuera del servicio se acuerdan antes de programar respaldos. No guardar respaldos dentro del repositorio ni de uploads.

1. Poner la aplicación y todos los escritores/jobs en mantenimiento, detener nuevas escrituras y esperar a que terminen las operaciones. La bandera del comando es una declaración del operador: no bloquea automáticamente la API. No llamar readiness continuamente durante el corte de archivos.
2. Elegir un directorio de respaldo **nuevo** fuera de uploads. Crear el respaldo completo de SQL + archivos + manifest de SHA-256/conteos/referencias. Se rechazan documentos con archivo faltante y cambios de archivos durante el proceso; no se omiten errores.
3. Restaurar en **otra base vacía ya creada** y otro directorio de documentos vacío. Verificar integridad/conteos automáticos; además ejecutar comprobaciones funcionales de pagos, vínculos, notas, descargas y permisos sobre esa copia.
4. Medir recuperación con volumen representativo. Definir responsable, RPO, RTO, frecuencia y retención; todavía no están acordados. No programar purgas por una cantidad de días elegida arbitrariamente.

```bash
# DB_* del origen y UPLOAD_DIRECTORY del volumen; ruta nueva absoluta:
npm run backup:create -- /ruta/privada/respaldo-nuevo --maintenance-confirmed
# Cambiar DB_* a la base de recuperación aislada y UPLOAD_DIRECTORY a su ruta vacía:
npm run backup:restore -- /ruta/privada/respaldo-nuevo --isolated-target-confirmed
```

El script se niega a restaurar en la base de origen o sobre tablas/archivos existentes, verifica SQL/archivos contra el manifest y compara conteos. SHA-256 detecta corrupción, no demuestra autenticidad frente a un atacante que altere también el manifest; proteger el respaldo completo. Una operación fallida puede dejar un destino parcial, sin manifest válido o con tablas parciales: aislarlo y revisar, sin usarlo para sustituir producción.

El respaldo consistente depende del corte de **todos** los escritores: DB y disco no son una transacción única. La prueba local recuperó las 29 tablas del sistema más el registro de versión, pagos separados, vínculos y el archivo sintético. Su duración de pocos segundos no constituye el RTO institucional.

## 6. Validación y publicación

CI definido en `.github/workflows/validate.yml`: Node 24, MySQL 8.0 temporal, instalación limpia, compilaciones, regresiones, prueba de respaldo/restauración, auditorías y Chromium escritorio/móvil. Está preparado; todavía no se ejecutó en GitHub. `npm run test:all` usa procesos separados y falla si falla cualquiera. No usar credenciales reales para pruebas que crean/eliminan bases.

`npm run test:e2e` arranca Vite y el fixture con datos sintéticos; administra su cierre/limpieza por IPC. Puertos exclusivos 4111/5183, sin reutilizar servicios existentes. El backend debe estar compilado y MySQL accesible con permisos para bases temporales. Se puede definir PLAYWRIGHT_BROWSERS_PATH para una instalación de Chromium accesible. Los traces/capturas solo deben contener datos sintéticos y están ignorados por Git.

Antes de abrir producción: preflight sin bloqueos, Docker construido/probado, cuatro roles y navegación directa por HTTPS real, proxy/IP validado, 10 MB, reinicio/redeploy del volumen, usuario DB limitado, recuperación completa y políticas/responsables acordados. La medición local de 40 consultas con concurrencia 8 y 4 logins simultáneos es un smoke test; acordar usuarios simultáneos/latencia/errores aceptables y volver a medir en preproducción.

Monitorizar `/api/health` y `/api/ready`, 5xx/503, fallos de respaldo y de archivos, conexiones y disco desde herramientas del proveedor y un monitor externo acordado. Los logs de producción omiten URL/parámetros, SQL, stack, tokens y contraseñas; conservan contexto estático y código de error. No activar dumps de solicitudes ni enviar datos de alumnos a servicios de logs por defecto.

Para revertir código, usar una versión previamente validada compatible con el esquema y comprobar salud/permisos. Revertir Vercel no revierte DB ni documentos. Restaurar un respaldo antiguo puede perder pagos posteriores: requiere corte, conciliación de escrituras y autorización del responsable. No ejecutar restauración de producción como reacción automática.

## 7. Decisiones institucionales pendientes

- Cuenta Railway, propietario de facturación, dominio, región, presupuesto y responsable técnico.
- Volumen/usuarios simultáneos, disponibilidad y objetivos de respuesta.
- RPO, RTO, calendario de respaldos, copia externa cifrada y responsables de recuperación.
- Retención y consulta de auditoría, conservación/borrado de matrícula y documentos, acceso a archivos archivados.
- Identificación/reset o desactivación de cuentas heredadas/demo y tratamiento de secretos históricos expuestos.
- Reglas de evaluación pendientes: publicación, cierre/reapertura y ponderación. Se mantienen las reglas actuales y las decisiones ya confirmadas: un periodo activo, históricos del profesor de consulta, contraseña que revoca todas las sesiones y pagos separados.

Estas decisiones no se pueden deducir del código. No se inventaron ni se trasladaron datos reales para resolverlas.
