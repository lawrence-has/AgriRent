import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('agrirent_user') || 'null'),
  token: localStorage.getItem('agrirent_token') || null,

  login: (token, user) => {
    localStorage.setItem('agrirent_token', token);
    localStorage.setItem('agrirent_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('agrirent_token');
    localStorage.removeItem('agrirent_user');
    set({ token: null, user: null });
  },

  setUser: (user) => {
    localStorage.setItem('agrirent_user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;
