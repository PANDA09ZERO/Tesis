import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync('gestion-educativa-seed-2026', 'salt-key', 32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText || !encryptedText.includes(':')) {
      return encryptedText;
    }
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encrypted = textParts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText;
  }
}

export function encryptPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(password: string, encryptedPassword: string): boolean {
  try {
    if (/^\$2[aby]\$/.test(encryptedPassword)) {
      return bcrypt.compareSync(password, encryptedPassword);
    }
    if (process.env.NODE_ENV === 'production') return false;
    return decrypt(encryptedPassword) === password;
  } catch {
    return false;
  }
}

export function needsPasswordRehash(passwordHash: string): boolean {
  return !/^\$2[aby]\$/.test(passwordHash);
}

export const encryptPasswordAsync = (password: string) => bcrypt.hash(password,12);
export async function verifyPasswordAsync(password: string, stored: string) {
  if (/^\$2[aby]\$/.test(stored)) return bcrypt.compare(password,stored);
  return process.env.NODE_ENV !== 'production' && verifyPassword(password,stored);
}
