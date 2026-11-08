# Instalación y cambios de esquema

`schema.sql` es la base consolidada `20261108_incidencias` (antes `20261028_credentials`). No incluye alumnos, cuentas ni pagos demo; solo los cuatro roles. Se instala **en una base vacía ya creada** con `npm run db:install -- --empty-database-confirmed` desde backend. El destino se toma exclusivamente de DB_NAME; el instalador elimina las instrucciones históricas CREATE DATABASE/USE del archivo y nunca crea ni borra una base.

La ejecución de DDL MySQL no es una transacción atómica. Ante un fallo, detenerse y revisar el destino; no repetir contra datos ni borrar tablas para continuar. El instalador rechaza destinos no vacíos y registra versión/checksum solo tras completar las comprobaciones.

Para una instalación existente: respaldo y restauración previa, `npm run db:check`, comparar SHOW CREATE TABLE (tipos, nulabilidad, índices y FKs) con schema.sql y revisar los scripts históricos de esta carpeta. **No ejecutar toda la carpeta**: algunos scripts son incrementales no idempotentes y podrían haberse aplicado. `migrate:payments` conserva su comprobación de duplicados y su uso explícito.

`npm run db:baseline -- --backup-confirmed --schema-reviewed` registra la versión de una base existente solo después de esa revisión. La comprobación automática revisa columnas y unicidad crítica; no certifica equivalencia completa de tipos/FKs ni cambia datos. Una versión ya registrada no se sobrescribe.

Para habilitar el cambio obligatorio de contraseña de cuentas nuevas, respaldar la base y aplicar manualmente `20261028_add_forced_password_change.sql` en la base `DB_NAME` antes de desplegar la API actualizada. La columna usa `DEFAULT 0`, por lo que las cuentas existentes conservan su acceso sin cambios. No ejecutar esta migración si la columna ya existe. Después de revisar estructura y tipos, registrar la versión con `npm run db:baseline -- --backup-confirmed --schema-reviewed`; la baseline anterior no se sobrescribe. Configurar `INSTITUTIONAL_EMAIL_DOMAIN` en el entorno del backend; el valor de ejemplo es solo un identificador de inicio de sesión y no representa un buzón real.

Las próximas migraciones deben ser numeradas, revisadas, ensayadas en copia aislada y registradas con checksum. No se ejecutan al arrancar la API. Usar credenciales de DDL separadas; la API requiere SELECT/INSERT/UPDATE/DELETE sobre su base, no CREATE/DROP/GRANT. Probar las operaciones y GET_LOCK con ese usuario en preproducción.

El checksum normaliza CRLF/LF para ser reproducible entre Windows y Linux. `production:check` exige la versión/checksum registrado y bloquea una baseline ausente o divergente. La migración puntual `npm run migrate:production` inspecciona el índice de sueldos sin escribir; `--apply --backup-confirmed --maintenance-confirmed` lo añade únicamente sin grupos duplicados. No borra ni fusiona historial.

## Incidencias y limpieza (20261108)

`schema.sql` pasa a la versión `20261108_incidencias`: agrega la tabla `incidencias` (módulo de conducta) y retira `profesor_curso`, el sistema de asignaciones reemplazado por `periodo_grado_curso_profesores`. Las bases instaladas antes conservaban además la tabla `secciones` y columnas `seccion_id` vacías en alumnos, horarios y matriculas, que ningún código usa.

Para una base existente: respaldar (Workbench: Server > Data Export) y ejecutar completo `20261108_workbench_incidencias_y_limpieza.sql`. Crea `incidencias`, elimina esos restos (se detiene si alguna `seccion_id` tuviera datos) y registra la versión con su checksum. Se puede repetir sin efectos. Si solo se necesita la tabla nueva: `npm run migrate:incidencias`.
