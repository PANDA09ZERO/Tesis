# Despliegue actual: backend en esta PC + Tailscale Funnel + Vercel (plan B)

Puesto en marcha el 06/11/2026. Oracle Cloud rechazó el registro de la cuenta, así que el backend se publica desde esta PC. Cuando haya un servidor, se sigue [despliegue-oracle.md](despliegue-oracle.md); el frontend en Vercel no cambia, salvo la variable `VITE_API_BASE_URL`.

| Pieza | Dónde | Dirección |
|---|---|---|
| Frontend (React/Vite) | Vercel, proyecto `cienciaseingeniaria` (equipo PANDAS, plan Hobby), conectado a `main` | https://cienciaseingeniaria.vercel.app |
| Backend (Express, modo producción) | Esta PC, con PM2 (`deploy/oracle/ecosystem.config.cjs`) | https://cienciaseingeniaria.tail4a4bea.ts.net/api |
| HTTPS público hacia el backend | Tailscale Funnel (certificado Let's Encrypt automático) | puerto 443 → `127.0.0.1:3000` |
| Base de datos | MySQL 8.0 local (servicio `MySQL80`, puerto 3307) | solo local |

**Limitación principal:** el sistema está en línea solo mientras esta PC esté prendida, sin suspenderse y con Internet.

## Archivos privados (fuera del repositorio)

`C:\gestion-produccion\`, con acceso solo para el usuario de Windows y SYSTEM:

- `backend.env`: variables de producción (JWT nuevo, usuario MySQL `gestion_app`, `CORS_ORIGINS`, carpetas).
- `credenciales-demo.txt`: contraseñas nuevas de las 4 cuentas demo. Las del repositorio público (`seed.ts`) ya no sirven.
- `operations\`: estado del panel de superadministración (`suspension.jsonl`).

## Encender el sistema (después de reiniciar la PC)

MySQL y Tailscale arrancan solos con Windows. El backend se levanta con:

```powershell
powershell -ExecutionPolicy Bypass -File C:\xampp\htdocs\Tesis\deploy\local\iniciar-sistema.ps1
```

Debe terminar con `Backend local: ready` y `Backend público: ready`.

## Actualizar

- **Frontend:** cada `git push` a `main` vuelve a desplegar en Vercel automáticamente.
- **Backend:** `cd backend && npm run build`, y luego ejecutar el script de arranque.
- Si cambia la URL del backend, actualiza `VITE_API_BASE_URL` en Vercel (*Settings → Environment Variables*) y vuelve a desplegar. Si cambia la del frontend, actualiza `CORS_ORIGINS` en `backend.env` y ejecuta el script.

## Detener o despublicar

```powershell
pm2 stop gestion-backend                                        # detiene la API
& 'C:\Program Files\Tailscale\tailscale.exe' funnel --https=443 off   # retira la URL pública
```

Para trabajar en modo desarrollo de nuevo (`npm run dev`), primero detén el backend de PM2, porque ambos usan el puerto 3000.

## Verificado el 06/11/2026

- `/api/ready` → 200 en local y por la URL pública, con certificado Let's Encrypt válido.
- CORS solo acepta `https://cienciaseingeniaria.vercel.app`; la verificación previa del navegador (preflight) responde 204 con las cabeceras correctas.
- Login, perfil y cursos de un profesor → 200 desde el origen de Vercel.
- Las contraseñas demo antiguas (publicadas) responden 401.
- Tailscale reemplaza cualquier `X-Forwarded-For` enviado por el cliente: `TRUST_PROXY=loopback` es seguro y el límite de intentos de login se aplica a la IP real.
- Vercel: `/`, `/login`, `/dashboard` y `/admin/pagos` cargan (200) y el código compilado apunta a la API pública.

## Pendiente

- La cuenta de profesor `Ari@edu.com` tiene una contraseña en formato antiguo y no puede entrar en producción. Hay que restablecerla desde *Usuarios*.
- `production:check` aún reporta: el índice único de sueldos, la baseline de esquema y 4 cuentas demo activas (ya con contraseñas nuevas). No impiden el funcionamiento. Se resuelven con el paso 4.5 de [despliegue-oracle.md](despliegue-oracle.md) usando el usuario administrador de MySQL.
- Respaldos: con el sistema en esta PC, respalda con `mysqldump` (sección 1.1 de la guía de Oracle) y guarda una copia fuera de la PC.
