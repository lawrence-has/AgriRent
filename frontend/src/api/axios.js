import axios from 'axios';

/**
 * Central Axios instance for all AgriRent API calls.
 *
 * Features:
 * - Auto-attaches JWT Bearer token from localStorage
 * - 30-second request timeout
 * - Global 401 handler: clears auth + redirects without full page reload
 * - Passes backend `success: false` errors through as proper Error objects
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  timeout: 30000, // 30 seconds — prevents infinite loading on slow/dead backend
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agrirent_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    // Backend standardized on { success: true, ... } in Contributions 1-7.
    // Pass successful responses straight through.
    return response;
  },
  (error) => {
    // ── Network / timeout errors ────────────────────────────────
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return Promise.reject(
          new Error('Request timed out. Please check your connection and try again.')
        );
      }
      return Promise.reject(
        new Error('Unable to reach the server. Please check your internet connection.')
      );
    }

    const { status, data } = error.response;

    // ── 401 — session expired or invalid token ──────────────────
    if (status === 401) {
      // Clear auth state from localStorage
      localStorage.removeItem('agrirent_token');
      localStorage.removeItem('agrirent_user');

      // Use React Router navigation if available, otherwise fallback
      // We use a custom event so the React app can handle navigation
      // without a full page reload losing app state
      const isLoginPage = window.location.pathname === '/login';
      if (!isLoginPage) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        // Fallback in case the event listener isn't mounted yet
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 500);
      }
    }

    // ── 403 — forbidden ─────────────────────────────────────────
    if (status === 403) {
      error.message = data?.message || 'You do not have permission to perform this action';
    }

    // ── 404 — not found ─────────────────────────────────────────
    if (status === 404) {
      error.message = data?.message || 'The requested resource was not found';
    }

    // ── 409 — conflict ──────────────────────────────────────────
    if (status === 409) {
      error.message = data?.message || 'This action conflicts with an existing record';
    }

    // ── 422 / 400 — validation error ────────────────────────────
    if (status === 400 || status === 422) {
      // Prefer the first validation error message if present
      if (data?.errors?.length) {
        error.message = data.errors[0].message;
      } else {
        error.message = data?.message || 'Invalid request data';
      }
    }

    // ── 500 — server error ──────────────────────────────────────
    if (status >= 500) {
      error.message = data?.message || 'A server error occurred. Please try again later.';
    }

    return Promise.reject(error);
  }
);

export default api;
