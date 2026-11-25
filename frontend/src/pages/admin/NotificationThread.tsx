import { useCallback, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { notificacionesApi } from '../../api/endpoints';

type Respuesta = { id: number; mensaje: string; created_at: string; usuario_id: number; nombre: string; apellido: string; rol: string };
type Thread = { notificacion: { id: number; titulo: string; mensaje: string; usuario_id: number | null; usuario_nombre?: string; usuario_apellido?: string; created_at: string }; respuestas: Respuesta[] };

const ROLES: Record<string, string> = { administrador: 'Administración', profesor: 'Profesor', alumno: 'Alumno', apoderado: 'Apoderado' };
const MAX = 2000;
const fecha = (value: string) => new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });

/** Mensaje original y conversación de una notificación, con el formulario para responder. */
export default function NotificationThread({ id, currentUserId, onChanged }: { id: number; currentUserId?: number; onChanged: () => void }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await notificacionesApi.getRespuestas(id);
      setThread(res.data.data);
      onChanged();
    } catch (error: any) {
      setLoadError(error.response?.data?.message || 'No se pudo abrir la conversación');
    }
  }, [id, onChanged]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mensaje = text.trim();
    if (!mensaje) { setSendError('Escribe tu respuesta.'); return; }
    if (sending) return;
    setSending(true); setSendError('');
    try {
      await notificacionesApi.responder(id, mensaje);
      setText('');
      await load();
    } catch (error: any) {
      setSendError(error.response?.data?.message || 'No se pudo enviar la respuesta');
    } finally { setSending(false); }
  };

  if (loadError) return <div role="alert" className="text-red-600 dark:text-red-400">{loadError} <button type="button" className="btn-secondary ml-2" onClick={() => void load()}>Reintentar</button></div>;
  if (!thread) return <p className="text-sm text-gray-500" aria-busy="true">Cargando conversación…</p>;

  const { notificacion, respuestas } = thread;
  const canReply = notificacion.usuario_id !== null;
  return (
    <div className="space-y-4">
      <section aria-label="Mensaje original" className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <p className="whitespace-pre-wrap text-[0.9375rem]">{notificacion.mensaje}</p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {fecha(notificacion.created_at)}{notificacion.usuario_nombre ? ` · Para ${notificacion.usuario_nombre} ${notificacion.usuario_apellido}` : ''}
        </p>
      </section>

      <section aria-label="Respuestas">
        {!respuestas.length
          ? <p className="text-sm text-gray-500 dark:text-gray-400">Aún no hay respuestas.</p>
          : <ol className="space-y-2">
              {respuestas.map(r => {
                const own = r.usuario_id === currentUserId;
                return (
                  <li key={r.id} className={`rounded-lg border p-3 ${own ? 'border-primary-200 bg-primary-50 dark:border-slate-600 dark:bg-slate-800' : 'border-gray-200 dark:border-gray-700'}`}>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{own ? 'Tú' : `${r.nombre} ${r.apellido}`} · {ROLES[r.rol] || r.rol} · {fecha(r.created_at)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[0.9375rem]">{r.mensaje}</p>
                  </li>
                );
              })}
            </ol>}
      </section>

      {canReply
        ? <form onSubmit={submit} className="space-y-2">
            <label htmlFor={`reply-${id}`} className="block text-sm font-medium">Tu respuesta</label>
            <textarea id={`reply-${id}`} value={text} onChange={e => setText(e.target.value)} maxLength={MAX} rows={3} className="input-field" placeholder="Escribe tu respuesta" />
            {sendError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{sendError}</p>}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{text.length}/{MAX}</span>
              <button type="submit" disabled={sending} className="btn-primary flex items-center gap-2"><Send className="h-4 w-4" aria-hidden="true" />{sending ? 'Enviando…' : 'Enviar respuesta'}</button>
            </div>
          </form>
        : <p className="text-sm text-gray-500 dark:text-gray-400">Esta notificación no tiene destinatario, así que no admite respuestas.</p>}
    </div>
  );
}
