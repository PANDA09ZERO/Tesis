# Probar desde la computadora y el móvil

El backend debe estar iniciado con `npm run dev` en `backend`, con MySQL disponible; el frontend con `npm run dev` en `frontend`. En la computadora abrir `http://localhost:5173/login`.

En el teléfono, conectado a la misma Wi-Fi, abrir la dirección **Network** que imprime Vite, seguida de `/login`, por ejemplo `http://192.168.1.20:5173/login`. La IP de ejemplo debe sustituirse por la de la computadora. `localhost` en el móvil apunta al propio teléfono. No cambiar la URL de API del móvil a localhost:3000.

El frontend local usa `/api` y el proxy Vite envía esas solicitudes al backend. Para solicitudes cuyo Origin coincide exactamente con el Host del frontend, el proxy de desarrollo retira ese Origin al enviarlas al backend; así la IP LAN no es rechazada por el CORS de localhost. Los orígenes externos, nulos o malformados no se ocultan. No se añadió un comodín ni se amplió CORS de producción.

Después de actualizar la configuración, reiniciar Vite con Ctrl+C y `npm run dev`, y recargar el login del móvil. Si el login no abre, revisar misma red y permiso del puerto de Vite en el firewall de red privada. Si abre pero falla iniciar sesión, el backend debe seguir funcionando en su terminal; comprobar también MySQL. Un mensaje «Credenciales inválidas» corresponde a la cuenta, mientras que «Origen no permitido» o un error de conexión corresponde al acceso a la API.

No reinstalar la base ni ejecutar seeds para resolver un problema de conexión. Se conservan las cuentas existentes. En producción, la API HTTPS explícita y sus orígenes exactos siguen configurándose según la guía operativa.

Validación de la corrección: `npm run test:dev-proxy` y `npm run build` desde frontend. La integración requiere el backend compilado y usa una conexión de base simulada: no modifica cuentas, contraseñas ni registros reales.

## Perfil con error de conexión y puerto ocupado

Si `/api/auth/profile` falla porque Vite no logra conectarse al backend, el proxy de desarrollo responde HTTP 503 con el código `DEV_BACKEND_UNAVAILABLE` y una instrucción para iniciar el backend. No devuelve un perfil de respaldo ni elimina la sesión por una indisponibilidad temporal. Tras iniciar el servidor, pulsar Reintentar; si la sesión ya caducó, el backend responderá 401 y se solicitará iniciar sesión de nuevo.

`EADDRINUSE ... 0.0.0.0:3000` indica que otro proceso ya ocupa el puerto. Mantener una sola terminal con el backend activo. No cerrar todos los procesos de Node: el frontend u otras aplicaciones pueden necesitarlos. Si no se reconoce la instancia, consultar en una terminal local `netstat -ano | findstr :3000` e identificar el PID antes de detener cualquier proceso.

Para comprobar el servidor, abrir `http://localhost:3000/api/health` y luego `http://localhost:5173/api/health`: ambos deben responder `status: ok`. `/api/ready` comprueba además la base de datos y el almacenamiento.

La prueba de integración del proxy cubre backend inaccesible (503 JSON) y recuperación tras reiniciarlo (401 sin credenciales), además del control de orígenes existente. Validaciones ejecutadas: `npm run test:dev-proxy` (3 pruebas), `npm run test:session` (6 pruebas) y `npm run build`, correctas. El aviso previo de tamaño del bundle permanece.
