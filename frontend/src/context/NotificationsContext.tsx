import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { notificacionesApi } from '../api/endpoints';
import { useAuth } from './AuthContext';

const POLL_MS = 30_000;
const SOUND_KEY = 'notificaciones-sonido';

/** Página de notificaciones de cada rol. */
export function notificationsPath(rol?: string) {
  return rol === 'administrador' ? '/admin/notificaciones'
    : rol === 'profesor' ? '/profesor/notificaciones'
    : rol === 'alumno' ? '/estudiante/notificaciones'
    : rol === 'apoderado' ? '/familia/notificaciones' : null;
}

type NotificationsState = {
  /** Notificaciones propias sin leer más, para la administración, respuestas sin abrir. */
  pending: number;
  unread: number;
  replies: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  refresh: () => Promise<void>;
  path: string | null;
};

const NotificationsContext = createContext<NotificationsState>({
  pending: 0, unread: 0, replies: 0, soundEnabled: true, setSoundEnabled: () => {}, refresh: async () => {}, path: null,
});

// Aviso corto de dos notas generado con Web Audio (sin archivos). Si el navegador aún no permite
// reproducir audio (sin interacción previa), se omite en silencio.
function playChime() {
  try {
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch { /* sin audio disponible */ }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [replies, setReplies] = useState(0);
  const [soundEnabled, setSoundState] = useState(() => localStorage.getItem(SOUND_KEY) !== 'off');
  const previous = useRef<number | null>(null);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const active = isAuthenticated && !!user && !user.debe_cambiar_password;

  const refresh = useCallback(async () => {
    if (!active) return;
    try {
      const res = await notificacionesApi.getNoLeidas();
      const data = res.data.data || {};
      const nextUnread = Number(data.total) || 0;
      const nextReplies = Number(data.respuestas_pendientes) || 0;
      const total = nextUnread + nextReplies;
      // Suena al llegar algo nuevo (también al entrar si hay pendientes), no en cada consulta.
      if (soundRef.current && total > (previous.current ?? 0)) playChime();
      previous.current = total;
      setUnread(nextUnread);
      setReplies(nextReplies);
    } catch { /* se reintenta en la siguiente consulta */ }
  }, [active]);

  useEffect(() => {
    if (!active) { previous.current = null; setUnread(0); setReplies(0); return; }
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [active, user?.id, refresh]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
    setSoundState(enabled);
    if (enabled) playChime();
  }, []);

  return (
    <NotificationsContext.Provider value={{ pending: unread + replies, unread, replies, soundEnabled, setSoundEnabled, refresh, path: notificationsPath(user?.rol) }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
