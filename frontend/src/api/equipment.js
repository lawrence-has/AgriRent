import api from './axios';

// Public equipment listing — archived excluded by default
export const getEquipment = (params) => api.get('/equipment', { params });

// Owner's own equipment — uses dedicated /owner/me endpoint
export const getMyEquipment = (params) => api.get('/equipment/owner/me', { params });

export const getEquipmentById = (id) => api.get(`/equipment/${id}`);
export const getEquipmentAvailability = (id) => api.get(`/equipment/${id}/availability`);

export const createEquipment = (data) =>
  api.post('/equipment', data, { headers: { 'Content-Type': 'multipart/form-data' } });

export const updateEquipment = (id, data) =>
  api.put(`/equipment/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });

// Dedicated status-only update (archive, maintenance, available)
export const updateEquipmentStatus = (id, status) =>
  api.patch(`/equipment/${id}/status`, { status });

export const deleteEquipment = (id) => api.delete(`/equipment/${id}`);

export const restoreEquipment = (id) => api.post(`/equipment/${id}/restore`);
