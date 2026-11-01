import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const ipDelServidor = window.location.hostname;

const api = axios.create({
  baseURL: `http://${ipDelServidor}:3000/api`,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
