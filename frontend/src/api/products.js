import api from './axios';

export const listProducts = () => api.get('vendors/products/').then(r => r.data);
export const createProduct = (data) => api.post('vendors/products/', data).then(r => r.data);
export const getProduct = (id) => api.get(`vendors/products/${id}/`).then(r => r.data);
export const updateProduct = (id, data) => api.put(`vendors/products/${id}/`, data).then(r => r.data);
export const deleteProduct = (id) => api.delete(`vendors/products/${id}/`).then(r => r.data);
