// Aplica 20261124_notificaciones_respuestas.sql sin Workbench.
// Es seguro repetirlo: solo agrega lo que falta y no modifica datos.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function migrateRespuestas(db, { recordVersion = true } = {}) {
 const [columnas] = await db.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones' AND COLUMN_NAME = 'respuesta_pendiente'");
 if (!columnas.length) await db.query('ALTER TABLE notificaciones ADD COLUMN respuesta_pendiente TINYINT(1) NOT NULL DEFAULT 0 AFTER fecha_leida');
 const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/20261124_notificaciones_respuestas.sql'), 'utf8');
 const tabla = sql.match(/CREATE TABLE IF NOT EXISTS notificacion_respuestas[\s\S]*?;/);
 if (!tabla) throw new Error('No se encontró la definición de notificacion_respuestas');
 await db.query(tabla[0]);
 if (!recordVersion) return;
 const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8').replace(/\r\n/g, '\n');
 await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 await db.query('INSERT IGNORE INTO schema_migrations(version,checksum) VALUES(?,?)', ['20261124_respuestas', createHash('sha256').update(schema).digest('hex')]);
}

module.exports = { migrateRespuestas };
if (require.main === module) {
 const pool = require('../dist/config/database').default;
 migrateRespuestas(pool)
  .then(() => console.log('Respuestas a notificaciones listas; no se modificaron datos existentes.'))
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => pool.end());
}
