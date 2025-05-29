import axios from 'axios';

// Get the API URL from environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const GOOGLE_AUTH_URL = import.meta.env.VITE_GOOGLE_AUTH_URL;;

// Create an axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
