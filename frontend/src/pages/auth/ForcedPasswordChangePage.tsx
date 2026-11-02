import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export default function ForcedPasswordChangePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (newPassword.length < 12 || new TextEncoder().encode(newPassword).length > 72) {
      setError('La nueva contraseña debe tener al menos 12 caracteres y máximo 72 bytes.');
      return;
    }
    if (newPassword !== confirmation) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      logout();
      toast.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
      navigate('/login', { replace: true });
    } catch (failure: any) {
      setError(failure.response?.data?.message || 'No se pudo cambiar la contraseña. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  return <main className="app-surface flex min-h-screen items-center justify-center p-4">
    <section className="card w-full max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Crea tu contraseña</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {user?.email} es tu usuario para entrar al sistema. Por seguridad, cambia la contraseña temporal para continuar.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">Contraseña temporal
          <input required type="password" autoComplete="current-password" className="input-field mt-1" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Nueva contraseña
          <input required minLength={12} type="password" autoComplete="new-password" className="input-field mt-1" value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Confirmar nueva contraseña
          <input required minLength={12} type="password" autoComplete="new-password" className="input-field mt-1" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">Usa al menos 12 caracteres; máximo 72 bytes.</p>
        {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-600 dark:border-red-900 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Actualizando…' : 'Cambiar contraseña y continuar'}</button>
      </form>
      <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="btn-secondary w-full">Cerrar sesión</button>
    </section>
  </main>;
}
