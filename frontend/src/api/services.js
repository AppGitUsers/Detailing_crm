import api from './axios';

export const listServices = (params) => api.get('services/', { params }).then(r => r.data);
export const createService = (data) => api.post('services/', data).then(r => r.data);
export const getService = (id) => api.get(`services/${id}/`).then(r => r.data);
export const updateService = (id, data) => api.put(`services/${id}/`, data).then(r => r.data);
export const deleteService = (id) => api.delete(`services/${id}/`).then(r => r.data);
export const listServicesWithVehicleType = (vehicleType) => api.get(`services/${vehicleType}/`).then(r => r.data);
export const listServiceProducts = (id) => api.get(`services/${id}/products/`).then(r => r.data);
export const addServiceProduct = (id, data) => api.post(`services/${id}/products/`, data).then(r => r.data);
export const removeServiceProduct = (productLinkId) => api.delete(`services/products/${productLinkId}/`).then(r => r.data);

export const listServiceEmployees = (id) => api.get(`services/${id}/employees/`).then(r => r.data);
export const addServiceEmployee = (id, data) => api.post(`services/${id}/employees/`, data).then(r => r.data);
export const removeServiceEmployee = (empLinkId) => api.delete(`services/employees/${empLinkId}/`).then(r => r.data);

// Vehicle-type pricing (upsert: POST creates or updates the row for that vehicle_type)
export const upsertServiceVehiclePrice = (serviceId, data) =>
  api.post(`services/${serviceId}/vehicle-prices/`, data).then(r => r.data);
export const deleteServiceVehiclePrice = (priceId) =>
  api.delete(`services/vehicle-prices/${priceId}/`).then(r => r.data);
