import api from './axios';

export const listInventory = (params) => api.get('vendors/inventory/', { params }).then(r => r.data);
export const getInventory = (id) => api.get(`vendors/inventory/${id}/`).then(r => r.data);
export const updateInventory = (id, data) => api.put(`vendors/inventory/${id}/`, data).then(r => r.data);
