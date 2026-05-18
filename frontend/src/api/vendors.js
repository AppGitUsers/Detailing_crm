import api from './axios';

export const listVendors = (params) => api.get('vendors/', { params }).then(r => r.data);
export const createVendor = (data) => api.post('vendors/', data).then(r => r.data);
export const getVendor = (id) => api.get(`vendors/${id}/`).then(r => r.data);
export const updateVendor = (id, data) => api.put(`vendors/${id}/`, data).then(r => r.data);
export const deleteVendor = (id) => api.delete(`vendors/${id}/`).then(r => r.data);
export const getVendorStatement = (id) => api.get(`vendors/${id}/statement/`).then(r => r.data);
