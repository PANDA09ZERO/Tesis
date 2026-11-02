const fs = require('node:fs');
const path = require('node:path');
const pool = require('../dist/config/database').default;
async function migratePayments(db = pool) {
  // Verificar antes de cualquier DDL: los importes y estados históricos requieren revisión humana si hay conflictos.
  for (const [table, group] of [
    ['mensualidades', 'alumno_id, periodo_academico_id, mes, año'],
  ]) {
    const [duplicates] = await db.query('SELECT ' + group + ', COUNT(*) cantidad FROM ' + table + ' GROUP BY ' + group + ' HAVING COUNT(*) > 1');
    if (duplicates.length) throw new Error('Hay duplicados en ' + table + '. Revise los registros sin combinarlos automáticamente.');
  }
  const sql = fs.readFileSync(path.join(__dirname, '../../database/migrations/separate_payments.sql'), 'utf8');
  for (const statement of sql.replace(/--[^\n]*/g, '').split(';').map(s => s.trim()).filter(Boolean)) await db.query(statement);
  for (const [table, name, columns] of [
    ['mensualidades', 'unique_mensualidad', 'alumno_id, periodo_academico_id, mes, año'],
    ['sueldos', 'unique_sueldo_mensual', 'profesor_id, mes, año'],
  ]) {
    const [indexes] = await db.query('SHOW INDEX FROM ' + table + ' WHERE Key_name = ?', [name]);
    if (table === 'sueldos') {
      const [duplicates] = await db.query('SELECT profesor_id, mes, año FROM sueldos GROUP BY profesor_id, mes, año HAVING COUNT(*) > 1');
      if (duplicates.length) {
        console.warn('Sueldos históricos duplicados conservados. Las nuevas altas se protegen mediante transacción y bloqueo del profesor; el índice único queda pendiente de revisión del historial.');
        continue;
      }
    }
    if (!indexes.length) await db.query('ALTER TABLE ' + table + ' ADD UNIQUE KEY ' + name + ' (' + columns + ')');
  }
}
module.exports = { migratePayments };
if (require.main === module) migratePayments().then(() => console.log('Migración de pagos aplicada')).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
