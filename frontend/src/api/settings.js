import api from './axios';

export const getSettings      = ()     => api.get('settings/').then(r => r.data);
export const updateSettings   = (data) => api.patch('settings/', data).then(r => r.data);
export const changePassword   = (data) => api.post('settings/change-password/', data).then(r => r.data);
