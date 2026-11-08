import { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { useInstallApp } from '../../hooks/useInstallApp';

const KEY = 'instalar-app-oculto';
const leerOculto = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/**
 * Invita a instalar el sistema como app. No se muestra si ya está instalada
 * o si el navegador no permite instalarla. `compacto` = solo el botón.
 */
export default function InstallAppCard({ compacto = false, permitirOcultar = true }: { compacto?: boolean; permitirOcultar?: boolean }) {
  const { canPrompt, needsIosSteps, install } = useInstallApp();
  const [oculto, setOculto] = useState(leerOculto);
  const [pasosIos, setPasosIos] = useState(false);
  if ((!canPrompt && !needsIosSteps) || (permitirOcultar && oculto)) return null;

  const ocultar = () => { setOculto(true); try { localStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ } };
  const accion = () => (canPrompt ? void install() : setPasosIos(v => !v));

  if (compacto) return <button type="button" onClick={accion} className="btn-secondary flex w-full items-center justify-center gap-2"><Download className="h-4 w-4" aria-hidden="true" /> Instalar app en este dispositivo</button>;

  return <section className="card relative space-y-3 border-primary-200 bg-primary-50/60 dark:border-gray-700 dark:bg-gray-900" aria-label="Instalar la aplicación">
    {permitirOcultar && <button type="button" onClick={ocultar} aria-label="No mostrar de nuevo" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>}
    <div className="flex items-start gap-3 pr-8">
      <img src="/assets/pwa-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white" />
      <div className="min-w-0">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Instala la app en tu celular</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Ábrela desde tu pantalla de inicio, a pantalla completa y sin buscar la página.</p>
      </div>
    </div>
    <button type="button" onClick={accion} className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"><Download className="h-4 w-4" aria-hidden="true" /> {canPrompt ? 'Instalar app' : 'Ver cómo instalar'}</button>
    {pasosIos && <ol className="space-y-2 rounded-xl bg-white p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
      <li className="flex items-center gap-2"><span className="font-semibold">1.</span> Abre esta página en <b>Safari</b>.</li>
      <li className="flex items-center gap-2"><span className="font-semibold">2.</span> Toca <Share className="h-4 w-4 shrink-0" aria-label="Compartir" /> <b>Compartir</b> (abajo o arriba).</li>
      <li className="flex items-center gap-2"><span className="font-semibold">3.</span> Elige <PlusSquare className="h-4 w-4 shrink-0" aria-hidden="true" /> <b>Agregar a inicio</b> y luego <b>Agregar</b>.</li>
    </ol>}
  </section>;
}
