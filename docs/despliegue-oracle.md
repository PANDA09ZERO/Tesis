# Despliegue en Oracle Cloud Always Free + Vercel

Guía paso a paso para publicar el sistema "Ciencias e Ingeniería":

- **Backend** (Node.js 24 + Express) y **MySQL 8** en una VM Always Free de Oracle Cloud.
- **Frontend** (React/Vite) en Vercel.

La arquitectura del código no cambia. Todo lo que se agregó para este despliegue está en `deploy/oracle/`.

Prompt original de esta tarea: [PROMPT-despliegue-oracle.md](PROMPT-despliegue-oracle.md). Detalles de operación (migraciones, respaldo verificable, cuentas): [operacion-produccion.md](operacion-produccion.md).

---

## 0. Arquitectura y decisiones clave

```
 Navegador (profesores, administración, alumnos, apoderados)
      │  HTTPS
      ├──────────────► Vercel ─ frontend estático (React)  https://cienciaseingeniaria.vercel.app
      │  HTTPS (llamadas a /api con token JWT)
      ▼
 Oracle Cloud ─ VM Ubuntu 24.04 Arm (Always Free)            https://API_DOMINIO
   ├─ Nginx :80/:443  ── proxy inverso + certificado Let's Encrypt
   ├─ PM2 → Node.js 24 → backend Express :3000   (solo accesible desde la propia VM)
   ├─ MySQL 8.0 :3306                            (solo 127.0.0.1)
   └─ /srv/gestion/{uploads,operations,backups}  documentos, panel de operaciones, respaldos
```

Estas cinco decisiones se pueden explicar en la sustentación:

1. **HTTPS es obligatorio, no opcional.** Vercel sirve el frontend por HTTPS, y el navegador bloquea las llamadas a una API `http://` ("contenido mixto"). Además, el backend en producción solo acepta orígenes `https://` en `CORS_ORIGINS`. Por eso la API necesita un dominio con certificado. Opción gratuita: un subdominio de [DuckDNS](https://www.duckdns.org) más Let's Encrypt.
2. **El puerto 3000 no se abre a Internet.** El backend escucha en `0.0.0.0:3000`, pero solo Nginx (en la misma VM) le habla. Así hay un único punto de entrada con TLS, límite de tamaño y cabeceras controladas. La regla 3000 del plan original se reemplaza por 80 y 443.
3. **En producción no se usa archivo `.env`.** `backend/src/config/environment.ts` ignora los `.env` cuando `NODE_ENV=production`, a propósito. Las variables viven en `/etc/gestion-educativa/backend.env`, fuera del repositorio. `deploy/oracle/ecosystem.config.cjs` se las pasa a PM2.
4. **MySQL solo escucha en localhost y hay tres usuarios.** `gestion_app` (la API: solo leer y escribir datos), `gestion_admin` (migraciones, desde una sesión SSH) y `gestion_respaldo` (solo lectura para los respaldos). La API nunca usa `root`; el backend lo rechaza en producción.
5. **Una sola instancia de la API.** El límite de intentos de inicio de sesión y el panel de operaciones viven en el proceso y en disco local. Para el uso previsto (sobre todo profesores y administración) una instancia sobra.

---

## 1. Preparación local (Windows, en `C:\xampp\htdocs\Tesis`)

### 1.1 Respaldo de MySQL (hecho el 06/11/2026)

Ya existe `backups/gestion_educativa_20261106_1113.sql`: 130 KB, 33 tablas, MySQL 8.0.46. La carpeta `backups/` está en `.gitignore`. El archivo contiene datos personales: no lo subas a GitHub ni lo compartas.

Para repetirlo justo antes de migrar, en PowerShell (pide la contraseña sin dejarla en el historial):

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -h 127.0.0.1 -P 3307 -u root -p `
  --single-transaction --routines --triggers --events --set-gtid-purged=OFF `
  --default-character-set=utf8mb4 --no-tablespaces `
  --result-file="backups\gestion_educativa_$(Get-Date -Format yyyyMMdd_HHmm).sql" gestion_educativa
```

Usa el `mysqldump` de MySQL 8.0, no el de XAMPP. El cliente MariaDB de XAMPP no se autentica con `caching_sha2_password`.

### 1.2 Variables de entorno del backend

| Variable | Valor en Oracle | Para qué sirve |
|---|---|---|
| `NODE_ENV` | `production` | Activa las validaciones estrictas y no carga `.env` |
| `PORT` | `3000` | Puerto interno (solo lo usa Nginx) |
| `JWT_SECRET` | `openssl rand -hex 48` | Firma de las sesiones. Mínimo 48 caracteres, distinto al local |
| `JWT_EXPIRES_IN` | `24h` | Duración de la sesión |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | MySQL de la misma VM |
| `DB_NAME` | `gestion_educativa` | Base de datos |
| `DB_USER` / `DB_PASSWORD` | `gestion_app` / contraseña nueva | Usuario limitado. Prohibido `root` |
| `DB_SSL` | `false` | El tráfico no sale de la VM (MySQL escucha solo en 127.0.0.1) |
| `CORS_ORIGINS` | `https://cienciaseingeniaria.vercel.app` | Origen exacto del frontend, sin barra final |
| `TRUST_PROXY` | `loopback` | Solo se confía en Nginx (misma VM) para conocer la IP real |
| `UPLOAD_DIRECTORY` | `/srv/gestion/uploads` | Documentos subidos (ruta absoluta) |
| `OPERATIONS_DIRECTORY` | `/srv/gestion/operations` | Panel de superadministración |
| `OPERATIONS_SINGLE_INSTANCE` | `true` | Confirma que hay una sola instancia |
| `MAX_UPLOAD_BYTES` | `10485760` | 10 MB por archivo |
| `ENABLE_DEMO_SEED` | `false` | Los datos demo están bloqueados en producción |
| `INSTITUTIONAL_EMAIL_DOMAIN` | `cienciaseingenieria.edu` | Dominio de los usuarios de acceso (no crea correos) |

Plantilla completa: `deploy/oracle/backend.env.example`. En el frontend (Vercel) solo hay una variable: `VITE_API_BASE_URL=https://API_DOMINIO/api`. Es pública; nunca pongas secretos en variables `VITE_*`.

### 1.3 El backend arranca localmente (verificado el 06/11/2026)

```powershell
cd C:\xampp\htdocs\Tesis\backend
npm run dev
# en otra terminal:
curl.exe http://localhost:3000/api/ready     # {"status":"ready"} → 200
```

### 1.4 Qué falta corregir en los datos antes de producción

`npm run production:check` (solo lectura) reporta hoy cuatro bloqueos. Se resuelven en el servidor, en el paso 4.5:

| Bloqueo | Qué significa | Cómo se resuelve |
|---|---|---|
| Falta `UNIQUE(profesor_id, mes, año)` en `sueldos` | Evita pagar dos veces el mismo mes a un profesor | `npm run migrate:production -- --apply ...` (no hay duplicados actuales) |
| 1 cuenta activa sin bcrypt | Producción no acepta contraseñas en formato antiguo | Restablecer su contraseña desde Usuarios o desactivarla |
| 4 cuentas demo activas (`*@escuela.edu`) | Cuentas de prueba con contraseñas conocidas | Desactivarlas (o cambiarles la contraseña si las usas para la demostración) |
| Falta la baseline | La base no tiene registrada su versión de esquema | `npm run db:baseline -- --backup-confirmed --schema-reviewed` |

### 1.5 Secretos expuestos en el historial de Git

El repositorio `PANDA09ZERO/Tesis` es **público**, y un `.env` antiguo sigue en tres commits del historial. No reutilices en Oracle ninguna contraseña o clave que haya estado en ese archivo: genera todas nuevas (pasos 3.4 y 4.3).

---

## 2. Oracle Cloud (consola web)

1. Crea la cuenta en <https://signup.cloud.oracle.com>. Pide tarjeta para verificar identidad; los recursos Always Free no se cobran. Elige con cuidado la **región de inicio**: no se puede cambiar. Para Perú, `Brazil East (São Paulo)` o `Chile Central (Santiago)` dan menor latencia.
2. Crea la llave SSH en tu PC (PowerShell):

   ```powershell
   ssh-keygen -t rsa -b 4096 -f $HOME\.ssh\oracle_gestion -C "cienciaseingeniaria"
   ```

3. **Red (VCN).** Menú → *Networking* → *Virtual Cloud Networks* → **Start VCN Wizard** → *Create VCN with Internet Connectivity*.
   - Nombre: `vcn-gestion`. Deja los rangos por defecto (VCN `10.0.0.0/16`, subnet pública `10.0.0.0/24`).
   - El asistente crea la subnet pública, el Internet Gateway y las rutas.
4. **Security List.** *vcn-gestion* → *Security Lists* → *Default Security List* → **Add Ingress Rules**:

   | Origen (CIDR) | Protocolo | Puerto destino | Motivo |
   |---|---|---|---|
   | `TU.IP.PUBLICA/32` (o `0.0.0.0/0` si tu IP cambia) | TCP | 22 | SSH |
   | `0.0.0.0/0` | TCP | 80 | HTTP (Let's Encrypt y redirección a HTTPS) |
   | `0.0.0.0/0` | TCP | 443 | HTTPS |

   **No agregues el puerto 3000** (ver decisión 2). La regla de SSH ya viene creada: si puedes, limítala a tu IP.
5. **Instancia.** *Compute* → *Instances* → **Create instance**:
   - Nombre: `gestion-backend`.
   - Image: **Canonical Ubuntu 24.04** (la variante aarch64 se elige sola con el shape Arm).
   - Shape: *Ampere* → **VM.Standard.A1.Flex**, **2 OCPU y 12 GB de RAM**. Deja la otra mitad del cupo gratuito (4 OCPU / 24 GB) libre para preproducción o para crecer.
   - Networking: `vcn-gestion`, subnet pública, **Assign a public IPv4 address: Yes**.
   - SSH keys: *Upload public key files* → `oracle_gestion.pub`.
   - Boot volume: 50 GB (el cupo gratuito total es 200 GB).
   - Si aparece **"Out of capacity for shape VM.Standard.A1.Flex"**, prueba otro *Availability Domain* o vuelve a intentarlo más tarde. Es habitual en las regiones con mucha demanda.
6. **IP pública.** En el detalle de la instancia copia la *Public IPv4 address*. Para conservarla aunque la instancia se recree, conviértela en *Reserved Public IP*: *Attached VNICs* → *IPv4 Addresses* → editar → **Reserved public IP**.
7. **Dominio gratuito.** En <https://www.duckdns.org> inicia sesión, crea un subdominio (p. ej. `cienciaseingeniaria`) y escribe la IP pública en *current ip*. Tu `API_DOMINIO` será `cienciaseingeniaria.duckdns.org`. Si la institución tiene dominio propio, crea un registro `A` (p. ej. `api.colegio.edu.pe` → IP) y úsalo en su lugar.

> **Recuperación de instancias inactivas:** Oracle puede detener las instancias Always Free con uso de CPU muy bajo durante 7 días en cuentas *Free Tier*. Pasar la cuenta a *Pay As You Go* (sigue sin costo si no se excede el cupo gratuito) evita esa recuperación. Revisa las condiciones vigentes antes de decidir.

---

## 3. Servidor

### 3.1 Conectarse por SSH (PowerShell)

```powershell
ssh -i $HOME\.ssh\oracle_gestion ubuntu@IP_PUBLICA
```

### 3.2 Actualizar e instalar paquetes (en la VM)

```bash
sudo apt update && sudo apt -y full-upgrade
sudo apt -y install git nginx mysql-server certbot python3-certbot-nginx unattended-upgrades

# Node.js 24 LTS (el proyecto exige ">=24 <25"):
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt -y install nodejs
node -v      # v24.x
sudo npm install -g pm2

sudo reboot   # si la actualización instaló un kernel nuevo; vuelve a conectar por SSH
```

### 3.3 Firewall de Ubuntu (iptables de Oracle)

Las imágenes Ubuntu de Oracle traen reglas `iptables` que **rechazan todo excepto SSH**, además de la Security List. Hay que abrir 80 y 443 también aquí. No uses `ufw`: Oracle recomienda no mezclarlo con estas reglas.

```bash
sudo iptables -L INPUT --line-numbers          # ubica la línea "REJECT ... reject-with icmp-host-prohibited"
# Inserta las reglas ANTES de esa línea (normalmente es la 5 o la 6; usa ese número):
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 5 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
sudo iptables -L INPUT --line-numbers          # 80 y 443 deben aparecer antes del REJECT
```

El puerto 3000 queda bloqueado desde fuera por la Security List y por iptables.

### 3.4 MySQL: endurecer, crear la base y los usuarios

```bash
sudo mysql_secure_installation      # Y a todo: quitar anónimos, root remoto y base test
sudo grep -E '^bind-address' /etc/mysql/mysql.conf.d/mysqld.cnf    # debe ser 127.0.0.1

# Genera tres contraseñas distintas y guárdalas en tu gestor de contraseñas:
for u in app admin respaldo; do echo "$u: $(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)"; done
```

```bash
sudo mysql
```

```sql
CREATE DATABASE gestion_educativa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'gestion_app'@'localhost'      IDENTIFIED BY 'CONTRASEÑA_APP';
CREATE USER 'gestion_admin'@'localhost'    IDENTIFIED BY 'CONTRASEÑA_ADMIN';
CREATE USER 'gestion_respaldo'@'localhost' IDENTIFIED BY 'CONTRASEÑA_RESPALDO';

-- API: solo datos. Sin CREATE/DROP/ALTER/GRANT.
GRANT SELECT, INSERT, UPDATE, DELETE, LOCK TABLES, SHOW VIEW, TRIGGER ON gestion_educativa.* TO 'gestion_app'@'localhost';
-- Migraciones y mantenimiento (solo desde SSH; nunca en la API).
GRANT ALL PRIVILEGES ON gestion_educativa.* TO 'gestion_admin'@'localhost';
-- Respaldos: solo lectura.
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES ON gestion_educativa.* TO 'gestion_respaldo'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

El cliente `mysql` no guarda en su historial las líneas que contienen `IDENTIFIED`.

---

## 4. Despliegue del backend

### 4.1 Carpetas de datos y código

```bash
sudo mkdir -p /srv/gestion/{uploads,operations,backups} /etc/gestion-educativa
sudo chown -R ubuntu:ubuntu /srv/gestion
chmod 700 /srv/gestion/uploads /srv/gestion/operations /srv/gestion/backups

cd ~
git clone https://github.com/PANDA09ZERO/Tesis.git
cd ~/Tesis/backend
npm ci --include=dev
npm run build            # genera dist/
```

### 4.2 Subir el respaldo y los documentos desde tu PC (PowerShell)

```powershell
cd C:\xampp\htdocs\Tesis
scp -i $HOME\.ssh\oracle_gestion backups\gestion_educativa_20261106_1113.sql ubuntu@IP_PUBLICA:~/
scp -i $HOME\.ssh\oracle_gestion -r backend\uploads ubuntu@IP_PUBLICA:/srv/gestion/
```

Los documentos se guardan en la base solo con su nombre de archivo, así que basta con copiar la carpeta.

### 4.3 Variables de entorno (en la VM)

```bash
sudo cp ~/Tesis/deploy/oracle/backend.env.example /etc/gestion-educativa/backend.env
sudo chown root:ubuntu /etc/gestion-educativa/backend.env
sudo chmod 640 /etc/gestion-educativa/backend.env
openssl rand -hex 48                                  # copia el resultado para JWT_SECRET
sudo nano /etc/gestion-educativa/backend.env
```

Completa `JWT_SECRET`, `DB_PASSWORD` (la de `gestion_app`) y `CORS_ORIGINS` (`https://cienciaseingeniaria.vercel.app`; si aún no la tienes, deja el nombre previsto y corrígelo en el paso 5.3).

### 4.4 Importar la base

```bash
sudo mysql gestion_educativa < ~/gestion_educativa_20261106_1113.sql
sudo mysql gestion_educativa -e "SHOW TABLES;" | wc -l     # 34 (33 tablas + encabezado)
shred -u ~/gestion_educativa_20261106_1113.sql             # no dejar copias sueltas con datos personales
```

### 4.5 Migraciones y cuentas (sesión de administración, con `gestion_admin`)

Los scripts del backend leen las variables del entorno de la sesión. Se cargan del archivo y se cambia el usuario a `gestion_admin` solo para esta sesión:

```bash
cd ~/Tesis/backend
set -a; . /etc/gestion-educativa/backend.env; set +a
export DB_USER=gestion_admin
read -rsp "Contraseña de gestion_admin: " DB_PASSWORD; export DB_PASSWORD; echo

npm run db:check                       # muestra lo que falta en el esquema
npm run migrate:production             # inspección, no escribe nada
npm run migrate:production -- --apply --backup-confirmed --maintenance-confirmed
```

Cuentas (decisión del responsable; revisa la lista antes de cambiar nada):

```bash
# Cuenta(s) sin bcrypt: identifícala y restablece su contraseña desde Usuarios, o desactívala.
sudo mysql gestion_educativa -e "SELECT id, email, activo FROM usuarios WHERE activo=1 AND password_hash NOT REGEXP '^[\$]2[aby][\$][0-9]{2}[\$]';"

# Cuentas demo con contraseñas conocidas: desactivarlas.
sudo mysql gestion_educativa -e "UPDATE usuarios SET activo=0 WHERE email IN ('admin@escuela.edu','profesor@escuela.edu','alumno@escuela.edu','apoderado@escuela.edu');"
```

Si las necesitas para la demostración ante el jurado, en lugar de desactivarlas cámbiales la contraseña desde *Usuarios* después del primer ingreso. Antes de desactivar `admin@escuela.edu`, comprueba que tienes otra cuenta de administrador activa.

```bash
npm run db:baseline -- --backup-confirmed --schema-reviewed
npm run production:check               # "ready": true, sin bloqueos
unset DB_PASSWORD DB_USER
```

### 4.6 Levantar con PM2

Primero inicializa el diario del panel de superadministración (`suspension.jsonl`). En producción, con `OPERATIONS_DIRECTORY` configurado, el login responde **500** si ese archivo falta. `npm run superadmin:bootstrap` solo lo crea al crear la supercuenta, y tu base importada ya tiene una. El comando usa la función del propio backend y no sobrescribe un estado existente:

```bash
cd ~/Tesis/backend
OPERATIONS_DIRECTORY=/srv/gestion/operations node -e "require('./dist/utils/operations').initializeOperations().then(()=>console.log('diario de operaciones listo'))"
cat /srv/gestion/operations/suspension.jsonl        # {"suspended":false,...}
```

```bash
cd ~/Tesis
pm2 start deploy/oracle/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu     # copia y ejecuta el comando "sudo env PATH=..." que imprime
pm2 status                                          # gestion-backend: online
curl -s -w " %{http_code}\n" http://127.0.0.1:3000/api/ready    # {"status":"ready"} 200
```

Si no responde: `pm2 logs gestion-backend --lines 50`. Un error de configuración (p. ej. `CORS_ORIGINS` o `JWT_SECRET` inválidos) aparece en la primera línea.

---

## 5. Nginx, HTTPS y frontend

### 5.1 Nginx como proxy inverso

```bash
sudo cp ~/Tesis/deploy/oracle/nginx-gestion.conf /etc/nginx/sites-available/gestion
sudo sed -i 's/API_DOMINIO/cienciaseingeniaria.duckdns.org/' /etc/nginx/sites-available/gestion
sudo cp /etc/nginx/sites-available/gestion /etc/nginx/sites-available/gestion.bak   # copia para el rollback
sudo ln -s /etc/nginx/sites-available/gestion /etc/nginx/sites-enabled/gestion
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
curl -s http://cienciaseingeniaria.duckdns.org/api/health   # desde tu PC: {"status":"ok",...}
```

### 5.2 Certificado SSL (Let's Encrypt, gratuito)

```bash
sudo certbot --nginx -d cienciaseingeniaria.duckdns.org --redirect -m TU_CORREO --agree-tos --no-eff-email
sudo certbot renew --dry-run                          # la renovación automática queda programada
```

Desde tu PC: `curl.exe https://cienciaseingeniaria.duckdns.org/api/ready` → `{"status":"ready"}`.

### 5.3 Frontend en Vercel

1. En <https://vercel.com> → **Add New → Project** → importa `PANDA09ZERO/Tesis`.
2. **Project Name:** `cienciaseingeniaria`. Vercel propone el nombre del repositorio (`tesis`): cámbialo antes de desplegar. Solo admite minúsculas, así que "CienciaseIngeniaria" se escribe `cienciaseingeniaria`, y la URL será `https://cienciaseingeniaria.vercel.app` si está libre. Si Vercel asigna otra, usa esa en `CORS_ORIGINS` (paso 6).
3. **Root Directory:** `frontend`. Framework: Vite. `frontend/vercel.json` ya define la instalación, el build, la salida `dist` y las rutas de la SPA.
4. *Settings → General → Node.js Version:* **24.x**.
5. *Environment Variables* (entorno **Production**): `VITE_API_BASE_URL` = `https://cienciaseingeniaria.duckdns.org/api`.
6. **Deploy.** Anota la URL final (`https://cienciaseingeniaria.vercel.app`). Si difiere de la que pusiste en `CORS_ORIGINS`, corrígela en la VM y reinicia:

   ```bash
   sudo nano /etc/gestion-educativa/backend.env       # CORS_ORIGINS=https://cienciaseingeniaria.vercel.app
   cd ~/Tesis && pm2 restart deploy/oracle/ecosystem.config.cjs --update-env && pm2 save
   ```

La URL de la API se incorpora al compilar: si la cambias en Vercel, hay que volver a desplegar. Los *Preview deployments* no están en `CORS_ORIGINS` y no podrán hablar con la API de producción, a propósito.

### 5.4 Verificar login y flujos principales

En la URL de Vercel, en computadora y celular:

- Ingresar con una cuenta de administrador, de profesor, de alumno y de apoderado.
- Recargar el navegador en `/dashboard` y `/admin/pagos`: no debe salir 404.
- Profesor: abrir un curso, ver calificaciones y asistencia.
- Administración: subir y descargar un documento (prueba un archivo cercano a 10 MB).
- Cambiar una contraseña y comprobar que las demás sesiones se cierran.
- En el navegador (F12 → Consola) no debe haber errores de CORS ni de *mixed content*.

---

## 6. Respaldos automáticos

```bash
sudo tee /etc/gestion-educativa/respaldo.cnf > /dev/null <<'EOF'
[client]
user=gestion_respaldo
password=CONTRASEÑA_RESPALDO
host=127.0.0.1
EOF
sudo chown root:ubuntu /etc/gestion-educativa/respaldo.cnf && sudo chmod 640 /etc/gestion-educativa/respaldo.cnf

chmod +x ~/Tesis/deploy/oracle/respaldo-bd.sh
~/Tesis/deploy/oracle/respaldo-bd.sh                 # prueba manual: "respaldo OK"
ls -lh /srv/gestion/backups

crontab -e
# Todos los días a las 02:30 (hora del servidor, UTC por defecto):
30 2 * * * /home/ubuntu/Tesis/deploy/oracle/respaldo-bd.sh >> /srv/gestion/backups/respaldo.log 2>&1
```

- Conserva 14 días (`RETENCION_DIAS`). Ajusta el valor según lo que acuerde la institución.
- **Copia fuera de la VM** (si la VM se pierde, los respaldos internos se pierden con ella). Una vez por semana, desde tu PC:

  ```powershell
  scp -i $HOME\.ssh\oracle_gestion "ubuntu@IP_PUBLICA:/srv/gestion/backups/bd_*.sql.gz" D:\respaldos-gestion\
  ```

  Otra opción gratuita es *Object Storage* de Oracle (20 GB Always Free).
- **Prueba de restauración** (al menos una vez antes de abrir el sistema): restaura en una base aparte y compara conteos:

  ```bash
  sudo mysql -e "CREATE DATABASE gestion_prueba_restauracion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  zcat /srv/gestion/backups/bd_AAAAMMDD_HHMM.sql.gz | sudo mysql gestion_prueba_restauracion
  sudo mysql -e "SELECT COUNT(*) FROM gestion_prueba_restauracion.usuarios; SELECT COUNT(*) FROM gestion_educativa.usuarios;"
  sudo mysql -e "DROP DATABASE gestion_prueba_restauracion;"
  ```

---

## 7. Checklist de verificación

- [ ] Respaldo local creado y guardado fuera del repositorio
- [ ] VM Ubuntu 24.04 Arm creada; SSH con llave funciona
- [ ] Security List: 22 (restringido si es posible), 80 y 443. **Sin** 3000
- [ ] iptables: 80 y 443 antes del REJECT y guardado con `netfilter-persistent`
- [ ] MySQL escucha solo en `127.0.0.1`; usuarios `gestion_app`, `gestion_admin` y `gestion_respaldo` creados
- [ ] Base importada (33 tablas); `production:check` → `"ready": true`
- [ ] `/etc/gestion-educativa/backend.env` con permisos `640 root:ubuntu`; secretos nuevos
- [ ] Diario de operaciones creado (`/srv/gestion/operations/suspension.jsonl`) y login correcto (no 500)
- [ ] `pm2 status` → online; `pm2 startup` y `pm2 save` hechos (sobrevive a `sudo reboot`)
- [ ] `https://API_DOMINIO/api/ready` → 200 desde Internet; `http://IP_PUBLICA:3000` **no** responde
- [ ] Certificado válido y `certbot renew --dry-run` correcto
- [ ] Vercel desplegado con `VITE_API_BASE_URL` correcto; `CORS_ORIGINS` coincide con la URL de Vercel
- [ ] Login y flujos de los cuatro roles verificados en computadora y celular
- [ ] Respaldo automático ejecutado al menos una vez, copia externa hecha y restauración probada

---

## 8. Recomendaciones de seguridad

- **SSH:** solo con llave (Oracle ya desactiva la contraseña) y la regla 22 limitada a tu IP. Opcional: `sudo apt install fail2ban`.
- **Actualizaciones:** `unattended-upgrades` aplica los parches de seguridad de Ubuntu. Revisa `sudo apt list --upgradable` y `npm audit` en `backend/` una vez al mes.
- **Secretos:** solo en `/etc/gestion-educativa/` (640). Nunca en Git, en variables `VITE_*`, en capturas ni en la presentación. Rota los secretos que estuvieron en el historial público.
- **Base de datos:** sin acceso remoto (bind 127.0.0.1, sin regla 3306). La API usa `gestion_app` sin permisos de esquema.
- **Superficie expuesta:** solo Nginx (80/443). La API valida CORS exacto, tamaño de subida (10 MB) y limita los intentos de login por cuenta e IP. Nginx sobrescribe `X-Forwarded-For` para que esa IP no se pueda falsificar.
- **Cuentas:** sin cuentas demo activas. Las contraseñas temporales obligan a crear una nueva (mínimo 12 caracteres) en el primer ingreso.
- **Monitoreo gratuito:** un monitor externo (p. ej. UptimeRobot, plan gratuito) sobre `https://API_DOMINIO/api/ready` avisa por correo si la API cae.

---

## 9. Plan de rollback

| Si falla… | Acción |
|---|---|
| **Una actualización del backend** | `cd ~/Tesis && git log --oneline -5`, luego `git checkout <commit_anterior>`, `cd backend && npm ci --include=dev && npm run build && pm2 restart gestion-backend`. Verifica `/api/ready`. Antes de cada actualización, anota el commit actual: `git rev-parse HEAD`. |
| **El frontend en Vercel** | *Deployments* → elegir el despliegue anterior que funcionaba → **Promote to Production** (instantáneo; no toca la base). |
| **Una migración de base** | MySQL no deshace DDL. Detén la API (`pm2 stop gestion-backend`), restaura el último respaldo en una base nueva (`gestion_restaurada`), revísala, cambia `DB_NAME` en `backend.env` y vuelve a arrancar. Se pierden los cambios hechos después del respaldo: decídelo con el responsable. |
| **Nginx o SSL** | `sudo nginx -t` muestra el error. Para volver a la configuración anterior: `sudo cp /etc/nginx/sites-available/gestion.bak /etc/nginx/sites-available/gestion` (haz ese `.bak` antes de editar) y `sudo systemctl reload nginx`. |
| **La VM completa** (reclamada, corrupta o sin capacidad) | Crear otra VM con los pasos 2–5 y restaurar el último respaldo externo (base + `uploads`). Actualizar la IP en DuckDNS; Vercel no cambia. |
| **Todo, el día de la sustentación** | El sistema local en XAMPP sigue intacto: `npm run dev` en `backend` y `frontend` lo levanta en `http://localhost:5173`. |

### Actualizar a una versión nueva (procedimiento normal)

```bash
cd ~/Tesis
git rev-parse HEAD > ~/ultimo_commit_bueno.txt
~/Tesis/deploy/oracle/respaldo-bd.sh
git pull
cd backend && npm ci --include=dev && npm run build
pm2 restart gestion-backend && sleep 3 && curl -s http://127.0.0.1:3000/api/ready
```

Si la versión nueva trae una migración SQL, aplícala antes del `pm2 restart` siguiendo el paso 4.5 y `database/migrations/README.md`.

---

## 10. Resumen para la sustentación

- **Costo:** cero. Oracle Always Free (VM Arm de 2 OCPU y 12 GB, 50 GB de disco), Vercel Hobby, DuckDNS y Let's Encrypt. Revisa que el plan Hobby de Vercel sea aceptable para el uso institucional; la alternativa es servir el frontend desde la misma VM con Nginx.
- **Arquitectura de tres capas:** presentación en una CDN (Vercel), lógica de negocio en Node.js/Express detrás de un proxy inverso con TLS, y datos en MySQL 8 sin exposición a Internet.
- **Seguridad en profundidad:** firewall de la nube (Security List) más firewall del sistema (iptables), HTTPS, CORS exacto, usuarios de base de datos con privilegio mínimo, secretos fuera del código y límites de intentos de login.
- **Continuidad:** respaldos diarios automáticos con verificación y copia externa, procedimiento de restauración probado y rollback documentado para cada capa.

---

## 11. Ensayo de esta guía en Docker (06/11/2026)

Los pasos 3.2 a 6 se ejecutaron tal cual, como usuario `ubuntu` con `sudo`, en un contenedor Ubuntu 24.04.5 que imita la VM. Se usaron datos ficticios: el esquema limpio del repositorio y un administrador de prueba, nunca la base real.

| Comprobación | Resultado |
|---|---|
| Node 24.22, MySQL 8.0.46, Nginx 1.24, certbot 2.9 y PM2 7.1 instalados con los comandos de la guía | OK |
| MySQL escucha solo en `127.0.0.1`; tres usuarios con sus permisos | OK |
| `db:install` → `admin:bootstrap` → `db:check` → `migrate:production` → `production:check` | OK, sin bloqueos |
| PM2 con `deploy/oracle/ecosystem.config.cjs` → `/api/ready` | 200 |
| Login sin `suspension.jsonl` | **500 → corregido** con la inicialización del paso 4.6; después 200 |
| `nginx -t` y `/api/ready` a través de Nginx | OK / 200 |
| CORS: origen de Vercel aceptado; origen ajeno sin cabecera | OK |
| Cuerpo de 13 MB | 413 (rechazado por Nginx) |
| 22 logins fallidos, cada uno con una IP falsa distinta en `X-Forwarded-For` | Bloqueado (429) desde el intento 20: la IP falsa no evita el límite |
| Cambio de `CORS_ORIGINS` + `pm2 restart … --update-env` | Toma el valor nuevo |
| `respaldo-bd.sh`: base y documentos, `sha256sum -c` y restauración en otra base | OK (33 tablas, mismos conteos) |

No se pudo ensayar: la consola y la red de Oracle (Security List, `iptables`), el procesador Arm (el contenedor es x86_64; los paquetes son los mismos), `pm2 startup` y el reinicio con systemd, el dominio DuckDNS, el certificado de Let's Encrypt, Vercel e importar la base real. En el contenedor, el instalador de `mysql-server` falla al detener su servidor temporal porque no hay systemd. Es un problema conocido de Docker que no ocurre en una VM.
