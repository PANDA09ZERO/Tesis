import { createHmac } from 'crypto';
// Huella autenticada de la credencial; no expone el hash de contraseña dentro del JWT.
export function credentialVersion(passwordHash: string, secret: string): string {
  return createHmac('sha256', secret).update(passwordHash).digest('hex');
}
