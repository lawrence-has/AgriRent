import api from './axios';

// Summary
export const getArchiveSummary = () => api.get('/archive/summary');

// Reservations
export const getArchivedReservations = (params) => api.get('/archive/reservations', { params });
export const archiveReservation = (id) => api.post(`/archive/reservations/${id}`);
export const restoreReservation = (id) => api.post(`/archive/reservations/${id}/restore`);
export const permanentDeleteReservation = (id) => api.delete(`/archive/reservations/${id}`);

// Transactions
export const getArchivedTransactions = (params) => api.get('/archive/transactions', { params });
export const archiveTransaction = (id) => api.post(`/archive/transactions/${id}`);
export const restoreTransaction = (id) => api.post(`/archive/transactions/${id}/restore`);

// Equipment
export const getArchivedEquipment = (params) => api.get('/archive/equipment', { params });

// Users
export const getArchivedUsers = (params) => api.get('/archive/users', { params });
