import { PoolConnection } from 'mysql2/promise';
// Una conexión cuyo rollback falla nunca vuelve al pool.
export async function finishTransaction(connection: PoolConnection | undefined, committed: boolean) {
  if (!connection) return;
  if (!committed) { try { await connection.rollback(); } catch { connection.destroy(); return; } }
  connection.release();
}
