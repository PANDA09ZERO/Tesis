import axios from 'axios';

// La app llama siempre a /api en su propio dominio. En desarrollo lo atiende el proxy de Vite; en
// Vercel, la regla de frontend/vercel.json lo reenvía al backend (hoy, el túnel de ngrok de esta PC).
// Así la dirección del backend vive en el repositorio y no en una variable del panel de Vercel.
const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    // El plan gratuito de ngrok muestra una página de aviso a los navegadores que rompería las
    // respuestas JSON; Vercel reenvía esta cabecera y ngrok la omite. Otros backends la ignoran.
    'ngrok-skip-browser-warning': 'true'
  }
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    if (response.config.url === '/auth/change-password' && response.config.headers?.Authorization === `Bearer ${localStorage.getItem('token')}`) {
      localStorage.removeItem('token'); localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:invalid'));
    }
    return response;
  },
  (error) => {
    if(error.response?.data?.code==='SYSTEM_SUSPENDED'&&error.config?.url!=='/auth/login')window.dispatchEvent(new Event('system:suspended'));
    if (error.response?.status === 401 && error.config?.url !== '/auth/login' && error.config?.headers?.Authorization === `Bearer ${localStorage.getItem('token')}`) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:invalid'));
    }
    return Promise.reject(error);
  }
);

export default client;