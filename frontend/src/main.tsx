import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PeriodoProvider } from './context/PeriodoContext';
import './index.css';
import { captureInstallPrompt } from './hooks/useInstallApp';

captureInstallPrompt();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('No se pudo registrar el service worker de la aplicación.', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PeriodoProvider>
          <App />
          <Toaster position="top-right" toastOptions={{ className: 'app-toast' }} />
        </PeriodoProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);