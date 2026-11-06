# Prompt: despliegue en Oracle Cloud Always Free

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
