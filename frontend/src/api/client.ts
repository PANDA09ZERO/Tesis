import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
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