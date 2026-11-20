import { create } from 'zustand';

/**
 * Safe JSON parse — returns null instead of crashing if the value is corrupted.
 */
const safeParseJSON = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const useAuthStore = create((set) => ({
  user: safeParseJSON(localStorage.getItem('agrirent_user')),
  token: localStorage.getItem('agrirent_token') || null,

  login: (token, user) => {
    localStorage.setItem('agrirent_token', token);
    localStorage.setItem('agrirent_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    try {
      localStorage.removeItem('agrirent_token');
      localStorage.removeItem('agrirent_user');
    } catch {
      // Always clear in-memory auth even if browser storage is unavailable.
    } finally {
      set({ token: null, user: null });
    }
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('agrirent_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('agrirent_user');
    }
    set({ user });
  },
}));

export default useAuthStore;
