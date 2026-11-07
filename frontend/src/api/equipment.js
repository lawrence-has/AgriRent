import api from './axios';

export const getEquipment = (params) => api.get('/equipment', { params });
export const getEquipmentById = (id) => api.get(`/equipment/${id}`);
export const getEquipmentAvailability = (id) => api.get(`/equipment/${id}/availability`);
export const createEquipment = (data) => api.post('/equipment', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateEquipment = (id, data) => api.put(`/equipment/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteEquipment = (id) => api.delete(`/equipment/${id}`);
