import { randomBytes } from 'crypto';
import { institutionalEmailDomain } from '../config/environment';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

export type AccountRole = 'administrador' | 'profesor' | 'alumno' | 'apoderado';

function normalizeNamePart(value: string) {
  const firstWord = value.trim().split(/\s+/)[0] || '';
  const normalized = firstWord.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-').replace(/^[._-]+|[._-]+$/g, '').replace(/[-_.]{2,}/g, '-');
  if (!normalized) throw new Error('No se pudo generar un usuario institucional válido');
  return normalized.slice(0, 28);
}

export function generateStudentCode() {
  return `ALU-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export function generateTemporaryPassword() {
  return randomBytes(18).toString('base64url');
}

export async function createInstitutionalCredentials(
  connection: PoolConnection,
  role: AccountRole,
  firstName: string,
  lastName: string
) {
  if (!['administrador', 'profesor', 'alumno', 'apoderado'].includes(role)) {
    throw new Error('Rol inválido para generar credenciales');
  }
  const base = `${normalizeNamePart(firstName)}.${normalizeNamePart(lastName)}`;
  const domain = institutionalEmailDomain();

  for (let suffix = 1; suffix <= 1000000; suffix++) {
    const localPart = suffix === 1 ? base : `${base}${suffix}`;
    if (localPart.length > 64) throw new Error('No se pudo generar un usuario institucional válido');
    const email = `${localPart}@${domain}`;
    const [existing] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    if (!existing.length) return { email, temporaryPassword: generateTemporaryPassword() };
  }

  throw new Error('No se pudo encontrar un usuario institucional disponible');
}
