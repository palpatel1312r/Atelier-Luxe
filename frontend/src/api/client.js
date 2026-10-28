import axios from 'axios';

// Keep the original local tenant endpoint for backwards compatibility.
// Production and other development tenants can override the URL in frontend/.env.
const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://abctraders.localhost:8000/api';
const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
