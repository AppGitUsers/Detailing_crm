import api from './axios';

const ACCESS_KEY = 'crm_access_token';
const REFRESH_KEY = 'crm_refresh_token';
const USER_KEY = 'crm_username';

export const tokens = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => localStorage.getItem(USER_KEY),
  set: (access, refresh, username) => {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (username) localStorage.setItem(USER_KEY, username);
  },
  setAccess: (access) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const login = async (username, password) => {
  const { data } = await api.post('token/', { username, password });
  tokens.set(data.access, data.refresh, username);
  return data;
};

export const refreshAccess = async () => {
  const refresh = tokens.getRefresh();
  if (!refresh) throw new Error('No refresh token');
  const { data } = await api.post('token/refresh/', { refresh });
  tokens.setAccess(data.access);
  return data.access;
};

export const logout = () => {
  tokens.clear();
};
