import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL;
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const ACCESS_KEY = 'crm_access_token';
const REFRESH_KEY = 'crm_refresh_token';
const AUTH_PATHS = ['token/', 'token/refresh/'];

const isAuthEndpoint = (url = '') => AUTH_PATHS.some((p) => url.endsWith(p));

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token && !isAuthEndpoint(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) throw new Error('No refresh token');
  refreshPromise = axios
    .post(`${API_URL}token/refresh/`, { refresh })
    .then((res) => {
      localStorage.setItem(ACCESS_KEY, res.data.access);
      return res.data.access;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error?.response?.status === 401 &&
      !original._retry &&
      !isAuthEndpoint(original.url)
    ) {
      original._retry = true;
      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem('crm_username');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const extractError = (err) => {
  if (err?.response?.data) {
    const d = err.response.data;
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    const msgs = [];
    for (const k of Object.keys(d)) {
      const v = d[k];
      if (Array.isArray(v)) msgs.push(`${k}: ${v.join(', ')}`);
      else msgs.push(`${k}: ${v}`);
    }
    if (msgs.length) return msgs.join(' | ');
  }
  return err?.message || 'An unexpected error occurred';
};

export default api;
