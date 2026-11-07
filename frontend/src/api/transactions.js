import api from './axios';

export const getTransactions = (params) => api.get('/transactions', { params });
export const getTransactionById = (id) => api.get(`/transactions/${id}`);
export const releaseEquipment = (data) => api.post('/transactions', data, { headers: { 'Content-Type': 'multipart/form-data' } });
export const returnEquipment = (id, data) => api.put(`/transactions/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
