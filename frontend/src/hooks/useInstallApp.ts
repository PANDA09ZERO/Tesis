import { useEffect, useState } from 'react';

// Evento que Chrome/Edge/Brave (Android y escritorio) disparan cuando la app se puede instalar.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
declare global {
  interface Window { __installPrompt?: BeforeInstallPromptEvent | null }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

/** Se llama una vez en main.tsx, antes de montar React, para no perder el evento. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.__installPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => { window.__installPrompt = null; notify(); });
}

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstallApp() {
  const [, setTick] = useState(0);
  useEffect(() => { const fn = () => setTick(n => n + 1); listeners.add(fn); return () => { listeners.delete(fn); }; }, []);
  const installed = isStandalone();
  const prompt = window.__installPrompt || null;
  const ios = isIos();
  return {
    installed,
    /** Android/escritorio: el navegador ofrece el diálogo de instalación. */
    canPrompt: !installed && !!prompt,
    /** iPhone/iPad: hay que usar "Compartir → Agregar a inicio". */
    needsIosSteps: !installed && ios,
    async install() {
      if (!prompt) return false;
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      window.__installPrompt = null; notify();
      return outcome === 'accepted';
    },
  };
}
