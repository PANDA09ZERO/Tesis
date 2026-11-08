const fs = require('node:fs');
const path = require('node:path');
const pool = require('../dist/config/database').default;
async function migrateIncidencias(db = pool) {
 const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/20261108_create_incidencias.sql'), 'utf8').replace(/^﻿/, '');
 const statements = sql.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').split(';').map(s => s.trim()).filter(Boolean);
 for (const statement of statements) await db.query(statement);
}
module.exports = { migrateIncidencias };
if (require.main === module) migrateIncidencias().then(() => console.log('Tabla incidencias creada (o ya existía); no se modificaron datos.')).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
