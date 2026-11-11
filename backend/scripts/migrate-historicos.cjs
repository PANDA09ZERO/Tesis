// Aplica 20261111_alumnos_historicos_tramites.sql sin Workbench.
// Es seguro repetirlo: solo agrega lo que falta y no modifica datos.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const pool = require('../dist/config/database').default;

const COLUMNAS = [
 ['es_historico', 'TINYINT(1) NOT NULL DEFAULT 0'],
 ['anio_ingreso', 'YEAR NULL'],
 ['anio_ultimo_estudio', 'YEAR NULL'],
 ['ultimo_grado_cursado', 'VARCHAR(80) NULL'],
 ['observaciones_historicas', 'TEXT NULL']
];

async function migrateHistoricos(db = pool) {
 await db.query("ALTER TABLE alumnos MODIFY Estado ENUM('matriculado','retirado','egresado','trasladado') DEFAULT 'matriculado'");
 const [existentes] = await db.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'alumnos'");
 const nombres = new Set(existentes.map(c => c.COLUMN_NAME));
 for (const [columna, definicion] of COLUMNAS) {
  if (!nombres.has(columna)) await db.query(`ALTER TABLE alumnos ADD COLUMN \`${columna}\` ${definicion}`);
 }
 const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/20261111_alumnos_historicos_tramites.sql'), 'utf8');
 const tabla = sql.match(/CREATE TABLE IF NOT EXISTS tramites_documentales[\s\S]*?;/);
 if (!tabla) throw new Error('No se encontró la definición de tramites_documentales');
 await db.query(tabla[0]);
 const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8').replace(/\r\n/g, '\n');
 await db.query('CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
 await db.query('INSERT IGNORE INTO schema_migrations(version,checksum) VALUES(?,?)', ['20261111_historicos', createHash('sha256').update(schema).digest('hex')]);
}

module.exports = { migrateHistoricos };
if (require.main === module) migrateHistoricos()
 .then(() => console.log('Alumnos históricos y trámites listos; no se modificaron datos existentes.'))
 .catch(error => { console.error(error.message); process.exitCode = 1; })
 .finally(() => pool.end());
