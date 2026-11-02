import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { configureDevelopmentProxy } from './devProxy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const publicApi = env.VITE_API_BASE_URL;
  if (process.env.VERCEL && !publicApi) throw new Error('Configure VITE_API_BASE_URL con la URL HTTPS del backend y sufijo /api');
  if(publicApi){const url=new URL(publicApi);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/api')||(mode==='production'&&url.protocol!=='https:'))throw new Error('VITE_API_BASE_URL inválida');}
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
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
