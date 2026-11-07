import api from './axios';

export const getConversations = () => api.get('/chat/conversations');
export const getMessages = (userId, params) => api.get(`/chat/${userId}`, { params });
export const sendMessage = (data) => api.post('/chat', data);
