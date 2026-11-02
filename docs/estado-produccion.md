# Estado de preparación para producción

Adenda del 21/10/2026: se implementó superadministración con aprovisionamiento privado, exclusión en Usuarios, suspensión persistente, respaldo/descarga autenticada y recuperación aislada. Véase [superadministracion.md](superadministracion.md). Esta mejora no cierra los bloqueos institucionales/cloud indicados abajo; sus cifras históricas requieren nueva comprobación antes de publicar. Las pruebas operativas solo utilizaron datos sintéticos; el alta nominal autorizada se informa en la entrega de esta función.

Fecha: 15/10/2026. Proyecto: `C:\xampp\htdocs\Tesis`.

**Preparación local implementada y validada; publicación institucional todavía bloqueada.** El propietario confirmó uso real, cuenta Vercel disponible, Railway aún sin cuenta y políticas institucionales pendientes. No se contrataron servicios, publicaron despliegues, importaron datos reales ni alteraron cuentas/pagos de la base instalada.

## 1. Cambios entregados

| Área | Archivos principales | Resultado |
|---|---|---|
| Secretos | `.gitignore`, ejemplos `.env.example`, índice Git | `.env` raíz retirado del índice y conservado localmente; JWT local nuevo. Historial remoto y credenciales externas requieren tratamiento del propietario |
| Entorno | `backend/src/config/environment.ts`, `config/database.ts` | Producción exige JWT fuerte, usuario MySQL limitado, orígenes HTTPS exactos y volumen absoluto; límites estrictos, TLS verificable y carga local solo fuera de producción |
| Arranque y HTTP | `src/app.ts`, `src/server.ts`, `controllers/health.controller.ts`, `middleware/errors.ts` | Importar app no abre puertos; shutdown, timeouts, liveness, readiness DB/disco, CORS/proxy configurable, 404/400/413/503 JSON y datos autenticados no-store |
| Cuentas | Controladores alumnos/profesores/apoderados/users/auth, `utils/accountValidation.ts`, `accountErrors.ts`, `transaction.ts`, `encrypt.ts` | Contraseña explícita, bcrypt asíncrono, validación de campos/fechas/cursos, duplicados 409 y referencias 400; conexiones protegidas, rollback y destrucción si rollback falla; producción rechaza credenciales legacy |
| Logs y seeds | `utils/logger.ts`, controladores que registraban errores completos, `routes/seed.routes.ts`, `scripts/seed.ts` | En producción no se imprime SQL/stack/valores privados; seeds HTTP/CLI bloqueados y login sin credenciales demo |
| Documentos e historial | `middleware/upload.ts`, `controllers/documentos.controller.ts`, `utils/documentValidation.ts`, `DocumentosPage.tsx`, matrícula DELETE | Ruta única persistente, límites de multipart, firmas y DOCX con ZIP/XML validados y límites; archivo conserva bytes/historial; borrado definitivo de matrícula suspendido en producción hasta política institucional |
| MySQL | `database/schema.sql`, `database/migrations/README.md`, `scripts/database.cjs`, `migrate-production.cjs`, `bootstrap-admin.cjs` | Instalación vacía reproducible y versión/checksum; corrección de orden FK e índice repetido; chequeos sin cambios, migración puntual de unicidad y bootstrap sin demo/defaults |
| Recuperación | `backend/scripts/backup.cjs` | Respaldo SQL/archivos/manifest, SHA-256, conteos y referencias; restauración únicamente en otro destino vacío; claves de cliente fuera de argv; corte de escrituras obligatorio por operador |
| Despliegue | `frontend/vercel.json`, `vite.config.ts`, `api/client.ts`, `backend/Dockerfile`, `.dockerignore`, `.node-version`, `railway.json` | Vercel SPA + API HTTPS explícita; Docker Node 24 con usuario no-root; healthcheck Railway; sin migración al arrancar |
| Dependencias y estilos | Ambos `package.json`/lock, frontend PostCSS/CSS/utilidades | Vite 7, Router 7, Tailwind 4, tsx en desarrollo; eliminadas cadenas vulnerables detectadas; componentes y diseño conservados con compatibilidad y revisión de capturas |
| Pruebas y CI | `backend/tests/production*`, tests anteriores adaptados al nuevo arranque/contraseña explícita, `scripts/test-all.cjs`, `frontend/tests/e2e`, `scripts/test-e2e.cjs`, `playwright.config.ts`, `.github/workflows/validate.yml` | Regresiones, instalación/recuperación, concurrencia sintética y navegador en cuatro roles; entornos sintéticos con cierre controlado por IPC |
| Documentación | README, este informe, `operacion-produccion.md`, plan por fases | Guía concreta de despliegue, variables, migración, respaldo/restauración y pendientes |

Se preservaron las reglas ya autorizadas: matrícula separada de mensualidad, pago de profesor directo como pagado con profesor/mes-año/monto, grado/periodo provenientes de matrícula, un periodo activo, profesor limitado a asignaciones e históricos de consulta, estudiante/apoderado vinculados y revocación de todas las sesiones por contraseña. No se reintrodujo IA.

## 2. Validación ejecutada

Entorno local: Windows, Node 24.14.1, MySQL 8; sin despliegue cloud. Los ensayos DB crean únicamente bases temporales con nombres verificados y datos ficticios; se eliminan al cerrar. Las pruebas anteriores que clonan tablas copian estructura con CREATE TABLE LIKE, nunca filas reales. La prueba nueva instala el esquema desde cero y recupera 29 tablas del sistema más schema_migrations.

| Comando / comprobación | Resultado |
|---|---|
| Backend `npm run build` | Compila |
| Regresiones profesores, estudiantes, pagos, integral y retiro de IA, mediante `npm run test:all` y archivos Node por proceso | Suite completa aprobada en la ejecución final; 111 casos backend, sin contar seis contenedores Node. El fixture de migración conserva el índice de soporte de FK antes de quitar el único |
| Backend `npm run test:production` | 10 casos unitarios + 12 casos HTTP/DB, aprobados; 23 entradas Node contando el contenedor de integración |
| Frontend `npm run build` | Compila: 2088 módulos; JS principal ~948 kB, ~260 kB gzip; continúa aviso >500 kB |
| Frontend `npm run test:session` | 5 casos aprobados |
| `npm run test:e2e` | 10 casos Chromium: escritorio y viewport Pixel 7, login y cuatro roles, navegación directa/recarga, acceso administrativo bloqueado a otros roles, panel del profesor con grupo asignado, capturas sintéticas |
| `npm audit --json` completo en ambos proyectos | 0 vulnerabilidades reportadas en la fecha de ejecución, incluyendo desarrollo; no equivale a una auditoría de seguridad completa |
| Backup/restore sintético con MySQL 8.0 cliente | SQL, conteos, vínculo de matrícula, estados/importes de matrícula/mensualidad y archivo recuperados; corrupción del SQL rechazada por checksum |
| Concurrencia sintética | 40 perfiles en lotes de 8 y 4 logins bcrypt simultáneos sin errores; una ejecución midió p95 local 78.7 ms y recuperación ~1.94 s, sin convertirlos en metas/RTO institucionales |
| `npm run db:check`, `npm run production:check` sobre base local, solo lectura | Detectan bloqueos reales; salida no exitosa intencional, ver sección siguiente |
| `npm run migrate:production` sin `--apply` | Propone índice único de sueldo; no cambió datos ni esquema |
| `git diff --check` | Sin errores de whitespace; Git avisa de conversiones LF/CRLF en archivos existentes |

En Windows se definieron para la prueba `MYSQLDUMP_BIN=C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe` y `MYSQL_BIN=C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe`. El MariaDB de XAMPP falló al autenticar con caching_sha2_password; esa ejecución fallida no se contó como recuperación exitosa. Las pruebas de navegador usan Chromium completo (`--no-shell`); se cambió el cierre de servicios a IPC después de detectar que el arnés inicial no terminaba limpiamente.

Se revisaron capturas de login y dashboard móvil; el cierre del arnés y las capturas no sustituyen aceptación visual/funcional en los dispositivos y dominios reales. CI está escrito pero no se ha ejecutado en GitHub; Docker no se construyó en esta estación porque no hay Docker disponible. Tampoco se probó Railway, DNS/TLS, proxy real, persistencia de volumen después de redeploy ni tamaño 10 MB atravesando la red pública.

## 3. Bloqueos concretos de la instalación actual

1. **Falta UNIQUE de sueldo por profesor/mes/año.** Inspección agregada encontró 0 grupos duplicados actuales; la migración puntual está preparada. Aplicarla después de respaldo/restauración comprobada, revisión y mantenimiento del destino. No se ejecutó DDL sobre la base instalada.
2. **Tres cuentas activas sin bcrypt.** Producción no las aceptará. Identificar propietarios y restablecer por el flujo autorizado o desactivar si corresponde. No se imprimieron ni cambiaron hashes/contraseñas.
3. **Cuatro cuentas con correos demo conocidos.** Revisar antes de importar. El chequeo es indicativo: no demuestra que todas las demás contraseñas sean fuertes o que no haya datos ficticios adicionales. No se desactivaron cuentas por aproximación.
4. **Baseline de esquema aún no registrada.** Después de revisar y migrar la base existente, registrar la versión/checksum mediante el comando de baseline documentado. Preflight también bloquea versiones ausentes o divergentes.
5. **Secretos históricos.** `.env` ya no queda en el índice actual, pero está en tres commits. Rotar credenciales afectadas y acordar tratamiento de historial/repositorio; no se hizo force-push ni cambio de contraseña MySQL existente.

Estos bloqueos se reportan como errores por preflight, sin un éxito de respaldo. La corrección del código no implica que la base existente haya quedado lista para publicar.

## 4. Estado por fase del plan

| Fase | Estado real |
|---|---|
| 0 — Arquitectura/operación | Uso institucional confirmado; arquitectura preparada. Cuenta Railway, presupuesto, dominio, región y responsables pendientes |
| 1 — Secretos/cuentas | Código/defaults/seeds e índice Git corregidos; revisión de cuentas, credenciales históricas y externas pendientes |
| 2 — Backend | Implementado y probado localmente; proxy/IP y usuario limitado real por validar; contador de login sigue siendo por proceso |
| 3 — DB | Instalación vacía y migración puntual ensayadas; revisión/migración/importación de la base institucional pendientes |
| 4 — Documentos | Configuración, validaciones, archivo conservador y restauración local probados; montaje/permisos/redeploy cloud pendientes |
| 5 — Vercel/integración | Archivos y variables preparados; falta backend real, dominios y despliegue HTTPS |
| 6 — Pruebas | Regresiones y Chromium local aprobados; CI remoto, matriz completa de negocio en preproducción, otros navegadores y objetivos de carga pendientes |
| 7 — Operación | Herramientas y runbook de recuperación entregados; frecuencia, retención, cifrado/copia externa, RPO/RTO, monitor y responsables sin definir |
| 8 — Publicación | Pendiente y bloqueada hasta cerrar criterios y autorización sobre despliegue concreto |
| 9 — Mantenimiento | Procedimiento documentado; no se ha programado una operación recurrente sin responsables/políticas |

## 5. Próximo paso del propietario

Definir cuenta/proyecto Railway, presupuesto, dominio y responsable técnico para preparar preproducción. Después resolver cuentas/secretos/migración con el respaldo real protegido y verificar la lista de salida en ese alojamiento. No se requiere inventar políticas para seguir preparando infraestructura, pero no se deben abrir datos reales sin acordar conservación/auditoría, recuperación y responsabilidades.

Instrucciones y comandos concretos: [operacion-produccion.md](operacion-produccion.md). La documentación de proveedores se verificó en sus páginas oficiales; confirmar costos y condiciones al contratar.
