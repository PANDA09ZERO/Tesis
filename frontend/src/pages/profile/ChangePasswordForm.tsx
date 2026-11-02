import { useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/endpoints';

export default function ChangePasswordForm({ minimum = 6 }: { minimum?: number }) {
  const [values, setValues] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    setError('');
    if (!values.actual || values.nueva.length < minimum || new TextEncoder().encode(values.nueva).length > 72) {
      setError(`Indica la contraseña actual y una nueva de al menos ${minimum} caracteres y máximo 72 bytes.`); return;
    }
    if (values.nueva !== values.confirmacion) { setError('La nueva contraseña y su confirmación no coinciden.'); return; }
    inFlight.current = true; setSaving(true);
    try {
      await authApi.changePassword(values.actual, values.nueva);
      setValues({ actual: '', nueva: '', confirmacion: '' }); setVisible({});
      toast.success('Contraseña actualizada. Inicia sesión nuevamente');
    } catch (failure: any) {
      setError(failure.response?.data?.message || 'No se pudo cambiar la contraseña. Vuelve a intentarlo.');
    } finally { inFlight.current = false; setSaving(false); }
  }
  const fields = [
    { key: 'actual', label: 'Contraseña actual', toggle: 'contraseña actual' },
    { key: 'nueva', label: 'Nueva contraseña', toggle: 'nueva contraseña' },
    { key: 'confirmacion', label: 'Confirmar nueva contraseña', toggle: 'confirmación' }
  ] as const;
  return <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
    <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100"><LockKeyhole className="h-5 w-5 shrink-0" aria-hidden="true"/>Cambiar contraseña</h2>
    <p id="password-policy" className="mt-2 text-sm text-gray-500 dark:text-gray-400">Usa al menos {minimum} caracteres y un máximo de 72 bytes. Al cambiarla, se cerrarán todas tus sesiones.</p>
    <form onSubmit={submit} className="mt-5 space-y-4" aria-busy={saving}>
      {fields.map(field => <div key={field.key}>
        <label htmlFor={`profile-password-${field.key}`} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
        <div className="relative"><input id={`profile-password-${field.key}`} required minLength={field.key === 'actual' ? undefined : minimum} type={visible[field.key] ? 'text' : 'password'} autoComplete={field.key === 'actual' ? 'current-password' : 'new-password'} aria-describedby="password-policy" disabled={saving} value={values[field.key]} onChange={e => { setValues({ ...values, [field.key]: e.target.value }); setError(''); }} className="input-field pr-12"/>
          <button type="button" disabled={saving} aria-label={`${visible[field.key] ? 'Ocultar' : 'Mostrar'} ${field.toggle}`} aria-pressed={!!visible[field.key]} onClick={() => setVisible({ ...visible, [field.key]: !visible[field.key] })} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">{visible[field.key] ? <EyeOff className="h-4 w-4" aria-hidden="true"/> : <Eye className="h-4 w-4" aria-hidden="true"/>}</button>
        </div>
      </div>)}
      {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-600 dark:border-red-900 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Guardando…' : 'Cambiar contraseña'}</button>
    </form>
  </section>;
}
