import api from './axios';

export const listInvoices = () => api.get('vendors/invoices/').then(r => r.data);
export const createInvoice = (data) => api.post('vendors/invoices/', data).then(r => r.data);
export const getInvoice = (id) => api.get(`vendors/invoices/${id}/`).then(r => r.data);
export const updateInvoice = (id, data) => api.put(`vendors/invoices/${id}/`, data).then(r => r.data);
export const deleteInvoiceItem = (itemId) => api.delete(`vendors/invoices/items/${itemId}/`).then(r => r.data);
export const listPayments = (invoiceId) => api.get(`vendors/invoices/${invoiceId}/payments/`).then(r => r.data);
export const createPayment = (invoiceId, data) => api.post(`vendors/invoices/${invoiceId}/payments/`, data).then(r => r.data);
