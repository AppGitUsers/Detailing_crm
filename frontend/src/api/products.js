import api from './axios';

export const listProducts = (params) => api.get('vendors/products/', { params }).then(r => r.data);
export const createProduct = (data) => api.post('vendors/products/', data).then(r => r.data);
export const getProduct = (id) => api.get(`vendors/products/${id}/`).then(r => r.data);
export const updateProduct = (id, data) => api.put(`vendors/products/${id}/`, data).then(r => r.data);
export const deleteProduct = (id) => api.delete(`vendors/products/${id}/`).then(r => r.data);

export const listProductTypes = () => api.get('vendors/product-types/').then(r => r.data);
export const createProductType = (data) => api.post('vendors/product-types/', data).then(r => r.data);
export const updateProductType = (id, data) => api.put(`vendors/product-types/${id}/`, data).then(r => r.data);
export const deleteProductType = (id) => api.delete(`vendors/product-types/${id}/`).then(r => r.data);
