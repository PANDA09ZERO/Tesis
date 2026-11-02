import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import Modal from './Modal';
import type { CreatedAccountCredentials } from '../../types';

export default function CreatedCredentialsModal({
  credentials,
  onClose
}: {
  credentials: CreatedAccountCredentials | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  async function copyCredentials() {
    setCopied(false);
    setCopyError('');
    try {
      await navigator.clipboard.writeText(`Usuario: ${credentials!.email}\nContraseña temporal: ${credentials!.temporaryPassword}`);
      setCopied(true);
    } catch {
      setCopyError('No se pudo copiar. Selecciona y copia las credenciales manualmente.');
    }
  }

  return (
    <Modal isOpen={credentials !== null} onClose={onClose} title="Credenciales creadas" size="md">
      {credentials && <div className="space-y-4">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          La contraseña temporal se muestra una sola vez. Entrégala de forma segura: se pedirá cambiarla en el primer inicio de sesión.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium">Usuario para iniciar sesión</label>
          <output className="block select-all break-all rounded-lg bg-gray-100 p-3 font-mono text-sm dark:bg-gray-800">{credentials.email}</output>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Contraseña temporal</label>
          <output className="block select-all break-all rounded-lg bg-gray-100 p-3 font-mono text-sm dark:bg-gray-800">{credentials.temporaryPassword}</output>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Este usuario solo sirve para entrar al sistema; no se creó un buzón de correo electrónico.
        </p>
        {copyError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{copyError}</p>}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => void copyCredentials()}>
            {copied ? <Check className="mr-2 inline h-4 w-4" /> : <Copy className="mr-2 inline h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar credenciales'}
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            <KeyRound className="mr-2 inline h-4 w-4" />Cerrar
          </button>
        </div>
      </div>}
    </Modal>
  );
}
