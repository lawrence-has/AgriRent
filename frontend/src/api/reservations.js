import api from './axios';

export const getReservations = (params) => api.get('/reservations', { params });
export const getMyReservations = (params) => api.get('/reservations/my', { params });
export const getReservationById = (id) => api.get(`/reservations/${id}`);
export const createReservation = (data) => api.post('/reservations', data);
export const updateReservation = (id, data) => api.put(`/reservations/${id}`, data);
export const deleteReservation = (id) => api.delete(`/reservations/${id}`);
