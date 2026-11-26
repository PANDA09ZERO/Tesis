import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PeriodoProvider } from './context/PeriodoContext';
import { NotificationsProvider } from './context/NotificationsContext';
import './index.css';
import { captureInstallPrompt } from './hooks/useInstallApp';

captureInstallPrompt();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Si ya había una versión controlando la página y llega otra, se recarga una vez para usar el
  // código nuevo. Sin esto, una app abierta (sobre todo en el celular) seguía con la versión vieja.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Al volver a la app (pestaña o app instalada), comprueba si hay una versión nueva.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update().catch(() => {});
      });
    }).catch((error: unknown) => {
      console.error('No se pudo registrar el service worker de la aplicación.', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PeriodoProvider>
          <NotificationsProvider>
            <App />
            <Toaster position="top-right" toastOptions={{ className: 'app-toast' }} />
          </NotificationsProvider>
        </PeriodoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);