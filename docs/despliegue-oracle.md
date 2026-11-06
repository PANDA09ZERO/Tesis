# Despliegue en Oracle Cloud Always Free

## Plan de trabajo

### Fase 1 — Preparación local
1. Hacer backup de la base de datos actual de XAMPP.
2. Revisar y documentar variables de entorno del backend.
3. Verificar que el backend arranca localmente.
4. Definir dominio o IP pública para el backend.

### Fase 2 — Oracle Cloud
1. Crear cuenta en Oracle Cloud.
2. Crear una instancia Always Free Arm con Ubuntu 22.04/24.04.
3. Configurar VCN, subnet pública y Security List:
   - SSH (22)
   - HTTP (80)
   - HTTPS (443)
   - Backend (3000 o detrás de Nginx)
4. Asignar IP pública o reservar una.

### Fase 3 — Servidor
1. Conectarse por SSH.
2. Actualizar sistema.
3. Instalar:
   - MySQL o MariaDB
   - Node.js LTS
   - Git
   - Nginx
   - PM2
4. Crear base de datos y usuario de aplicación.

### Fase 4 — Despliegue backend
1. Clonar repositorio.
2. Instalar dependencias del backend.
3. Configurar `.env`.
4. Importar dump de la BD local.
5. Ejecutar migraciones si existen.
6. Levantar backend con PM2.
7. Verificar `/api/ready`.

### Fase 5 — Frontend
1. Desplegar frontend en Vercel.
2. Configurar `VITE_API_BASE_URL` hacia el backend público.
3. Verificar login y flujos principales.

### Fase 6 — Seguridad y estabilidad
1. Configurar firewall.
2. Configurar Nginx como reverse proxy.
3. Opcional: SSL con Let's Encrypt.
4. Configurar backups de BD.

---

## Prompt para Claude

```text
Actúa como un ingeniero DevOps senior. Necesito desplegar mi tesis en Oracle Cloud Always Free.

Contexto del proyecto:
- Repositorio: C:\xampp\htdocs\Tesis
- Backend: Node.js/Express + TypeScript, ubicado en /backend
- Frontend: React/Vite, ubicado en /frontend
- Base de datos actual: MySQL en XAMPP (localhost:3307), base gestion_educativa
- El backend tiene Dockerfile y railway.json, pero quiero usar Oracle Cloud Always Free.
- La mayoría de usuarios serán profesores y administración; alumnos/apoderados acceden ocasionalmente.

Objetivo:
Desplegar backend + MySQL en una VM Always Free de Oracle Cloud y frontend en Vercel, con una guía paso a paso clara y comandos exactos.

Plan requerido:
1. Preparación local:
   - Backup de MySQL con mysqldump.
   - Revisar y documentar variables .env del backend.
   - Verificar que el backend arranca localmente.

2. Oracle Cloud:
   - Crear instancia Always Free Arm con Ubuntu 22.04/24.04.
   - Configurar red (VCN, subnet pública, Security List para 22, 80, 443 y 3000).
   - Asignar IP pública.

3. Servidor:
   - Conectar por SSH.
   - Actualizar paquetes.
   - Instalar MySQL/MariaDB, Node.js LTS, Git, Nginx y PM2.
   - Crear base de datos y usuario de aplicación.

4. Despliegue backend:
   - Clonar repositorio.
   - Instalar dependencias.
   - Configurar .env.
   - Importar dump de la BD.
   - Ejecutar migraciones si existen.
   - Levantar con PM2.
   - Verificar /api/ready.

5. Frontend:
   - Desplegar en Vercel.
   - Configurar VITE_API_BASE_URL hacia el backend público.
   - Verificar login y flujos principales.

6. Seguridad:
   - Configurar firewall.
   - Configurar Nginx como reverse proxy.
   - Opcional: SSL con Let's Encrypt.
   - Configurar backups de BD.

Entregables:
- Comandos exactos para cada paso.
- Variables de entorno necesarias.
- Checklist de verificación.
- Recomendaciones de seguridad.
- Plan de rollback si algo falla.

Restricciones:
- Preferir soluciones gratuitas.
- Mantener compatibilidad con MySQL.
- No cambiar la arquitectura más de lo necesario.
- Explicar en español y de forma clara para una sustentación de tesis.
```

---

## Scripts sugeridos

### Backup local
```bash
mysqldump -h 127.0.0.1 -P 3307 -u root -p gestion_educativa > backup_gestion_educativa.sql
```

### Instalación en Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y mysql-server nodejs npm git nginx
sudo npm install -g pm2
```

### Backend
```bash
git clone https://github.com/PANDA09ZERO/Tesis.git
cd Tesis/backend
npm install
cp .env.example .env
# editar .env con credenciales de la VM
npm run build
pm2 start npm --name gestion-backend -- run start
pm2 save
pm2 startup
```

### Verificación
```bash
curl http://localhost:3000/api/ready
```

---

## Checklist
- [ ] Backup de BD creado
- [ ] VM creada y accesible por SSH
- [ ] MySQL funcionando
- [ ] Backend arrancando con PM2
- [ ] `/api/ready` responde 200
- [ ] Frontend desplegado en Vercel
- [ ] `VITE_API_BASE_URL` configurado
- [ ] Login funcionando
- [ ] Firewall configurado
- [ ] Backups programados