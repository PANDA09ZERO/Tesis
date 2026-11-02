import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, Mail, LogOut, RefreshCw, BadgeCheck } from 'lucide-react';
import { authApi, estudianteApi, profesorPersonalApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordForm from './ChangePasswordForm';

function date(value: unknown) {
  if (!value) return '';
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10).split('-').reverse().join('/') : text;
}
function Info({ title, fields }: { title: string; fields: Array<[string, unknown]> }) {
  return <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    <dl className="mt-4 grid min-w-0 grid-cols-2 gap-4">{fields.map(([label, value]) => <div key={label} className={`min-w-0 ${label==='Dirección' ? 'col-span-2' : ''}`}><dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-gray-800 [overflow-wrap:anywhere] dark:text-gray-200">{value == null || value === '' ? 'Sin registrar' : String(value)}</dd></div>)}</dl>
  </section>;
}
export default function ProfilePage() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const [section, setSection] = useState('datos');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const [savingPersonal, setSavingPersonal] = useState(false), [personalError, setPersonalError] = useState(''), [personalSaved, setPersonalSaved] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setProfile(null);
    const request = user?.rol === 'profesor' ? profesorPersonalApi.getPerfil() : user?.rol === 'alumno' ? estudianteApi.getContexto() : authApi.getProfile();
    request.then(response => {
      if (!active) return;
      const data = user?.rol === 'alumno' ? response.data.data?.alumno : response.data.data;
      if (!data || typeof data.nombre !== 'string' || typeof data.apellido !== 'string' || typeof data.email !== 'string') throw new Error('El servidor no devolvió un perfil válido.');
      setProfile(data);
    }).catch(failure => { if (active) setError(failure.response?.data?.message || failure.message || 'No se pudo cargar tu perfil.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload, user?.id, user?.rol]);
  if (loading) return <div role="status" className="space-y-4"><span className="sr-only">Cargando perfil…</span><div className="card h-32 animate-pulse"/><div className="card h-64 animate-pulse"/></div>;
  if (error) return <div role="alert" className="card space-y-3 text-red-600 dark:text-red-400"><p>{error}</p><button type="button" className="btn-secondary" onClick={() => setReload(n => n + 1)}>Reintentar perfil</button></div>;
  if (!profile) return null;
  const role = user?.rolSistema === 'superadministrador' ? 'Superadministrador' : ({ administrador: 'Administrador', profesor: 'Profesor', alumno: 'Estudiante', apoderado: 'Apoderado' }[user?.rol || ''] || '');
  const personal: Array<[string, unknown]> = [['DNI', profile.dni], ['Teléfono', profile.telefono], ['Dirección', profile.direccion]];
  if (user?.rolSistema === 'superadministrador') {
    personal.push(
      ['Fecha de nacimiento', date(profile.fecha_nacimiento)],
      ['Género', ({ M: 'Masculino', F: 'Femenino', Otro: 'Otro' } as Record<string, string>)[profile.genero] || profile.genero]
    );
  }
  async function savePersonalData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPersonal) return;
    setSavingPersonal(true); setPersonalError(''); setPersonalSaved('');
    try {
      await authApi.updatePersonalProfile({
        fecha_nacimiento: profile.fecha_nacimiento || null,
        genero: profile.genero
      });
      setPersonalSaved('Tus datos personales se actualizaron.');
    } catch (failure: any) {
      setPersonalError(failure.response?.data?.message || 'No se pudieron guardar tus datos personales.');
    } finally {
      setSavingPersonal(false);
    }
  }
  const institutional: Array<[string, unknown]> = user?.rol === 'profesor' ? [['Especialidad', profile.especialidad], ['Título profesional', profile.titulo_profesional], ['Fecha de ingreso', date(profile.fecha_ingreso)]] : user?.rol === 'alumno' ? [['Código de alumno', profile.codigo_alumno]] : [];
  return <div className="profile-page mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mi perfil</h1><button type="button" onClick={() => setReload(n => n + 1)} className="btn-secondary gap-2 text-sm"><RefreshCw className="h-4 w-4" aria-hidden="true"/>Actualizar perfil</button></div>
    <section aria-label="Resumen de mi cuenta" className="flex min-w-0 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:gap-4 sm:p-5">
      <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-lg font-bold text-primary-700 dark:bg-gray-800 dark:text-gray-100">{profile.nombre?.[0]}{profile.apellido?.[0]}</span>
      <div className="min-w-0"><h2 className="break-words text-lg font-semibold text-gray-900 dark:text-gray-100">{profile.nombre} {profile.apellido}</h2><p className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"><BadgeCheck className="h-3 w-3" aria-hidden="true"/>{role}</p><p className="mt-2 flex min-w-0 items-start gap-2 break-all text-sm text-gray-500 dark:text-gray-400"><Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/>{profile.email}</p></div>
    </section>
    <nav aria-label="Secciones del perfil" className="grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900 lg:hidden">{[['datos','Mis datos'],['seguridad','Seguridad']].map(([key,label]) => <button key={key} type="button" aria-pressed={section===key} aria-controls={`profile-${key}`} onClick={() => setSection(key)} className={`min-h-12 rounded-lg px-3 text-sm font-medium ${section===key ? 'bg-primary-600 text-white dark:bg-gray-700' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}>{label}</button>)}</nav>
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <div id="profile-datos" className={`min-w-0 space-y-5 lg:col-span-2 ${section==='datos' ? '' : 'hidden lg:block'}`}><Info title="Datos personales" fields={personal}/>{institutional.length > 0 && <Info title="Información institucional" fields={institutional}/>}
        {user?.rolSistema !== 'superadministrador' ? <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Completa tus datos personales</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Puedes actualizar tu fecha de nacimiento y género. La dirección y los demás datos de identidad los gestiona administración.</p>
          <form className="mt-4 space-y-4" onSubmit={savePersonalData}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Fecha de nacimiento<input aria-label="Fecha de nacimiento" className="input-field mt-1" type="date" value={String(profile.fecha_nacimiento || '').slice(0, 10)} onChange={event => setProfile((current: any) => ({ ...current, fecha_nacimiento: event.target.value }))}/></label>
              <label className="block text-sm font-medium">Género<select aria-label="Género" className="input-field mt-1" value={profile.genero || 'Otro'} onChange={event => setProfile((current: any) => ({ ...current, genero: event.target.value }))}><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option></select></label>
            </div>
            {personalError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{personalError}</p>}
            {personalSaved && <p role="status" className="text-sm text-green-700 dark:text-green-400">{personalSaved}</p>}
            <button type="submit" className="btn-primary" disabled={savingPersonal}>{savingPersonal ? 'Guardando…' : 'Guardar datos'}</button>
          </form>
        </section> : <div className="flex items-start gap-2 rounded-xl border border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"><UserRound className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/><p>Los datos personales de esta cuenta son de consulta.</p></div>}
      </div>
      <div id="profile-seguridad" className={`min-w-0 space-y-4 ${section==='seguridad' ? '' : 'hidden lg:block'}`}><ChangePasswordForm minimum={user?.rolSistema === 'superadministrador' ? 12 : 6}/><button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }} className="btn-secondary w-full gap-2"><LogOut className="h-4 w-4" aria-hidden="true"/>Cerrar sesión</button></div>
    </div>
  </div>;
}
