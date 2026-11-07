import api from './axios';

export const getAdminStats = () => api.get('/dashboard/stats');
export const getOwnerStats = () => api.get('/dashboard/owner-stats');
export const getFarmerStats = () => api.get('/dashboard/farmer-stats');
