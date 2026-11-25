import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { configureDevelopmentProxy } from './devProxy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // La app llama a /api en su propio dominio; en Vercel, frontend/vercel.json reenvía esas llamadas
  // al backend. VITE_API_BASE_URL ya no se usa (si sigue definida en Vercel, se ignora).
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],
    // Las páginas se cargan de forma diferida: analizar todo src al arrancar evita que el servidor de
    // desarrollo descubra dependencias tarde y recargue la página en mitad del uso (o de las pruebas).
    optimizeDeps: { entries: ['index.html', 'src/**/*.{ts,tsx}'] },
    server: {
      // Precompila las páginas diferidas al arrancar: la primera visita no espera a compilarlas.
      warmup: { clientFiles: ['./src/main.tsx', './src/pages/**/*.tsx'] },
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: configureDevelopmentProxy
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          configure: configureDevelopmentProxy
        }
      }
    }
  };
});
