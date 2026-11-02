const fs = require('node:fs');
const path = require('node:path');
const pool = require('../dist/config/database').default;
async function migrateReportRules(db = pool) {
 const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/student_report_rules.sql'), 'utf8').replace(/^\uFEFF/, '');
 for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await db.query(statement);
}
module.exports = { migrateReportRules };
if (require.main === module) migrateReportRules().then(() => console.log('Reglas y versiones de libretas: tablas creadas; notas existentes conservadas.')).catch(error => { console.error(error.message); process.exitCode=1; }).finally(() => pool.end());
