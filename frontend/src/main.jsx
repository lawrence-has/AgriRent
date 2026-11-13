import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx client errors — retrying won't fix them
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        // Retry up to 2 times on network/server errors
        return failureCount < 2;
      },
      staleTime: 1000 * 60,       // 1 minute — data stays fresh
      gcTime: 1000 * 60 * 5,      // 5 minutes — keep in cache after unmount
      refetchOnWindowFocus: true,  // Refresh when user returns to tab
      refetchOnReconnect: true,    // Refresh when network reconnects
    },
    mutations: {
      // Global mutation error handler — shows toast for unhandled errors
      onError: (error) => {
        const message = error?.message || 'An unexpected error occurred';
        // Don't double-toast if the component already handles the error
        // Components that handle errors locally should NOT use this global handler
        // This is a last-resort fallback only
        console.error('[QueryClient] Unhandled mutation error:', message);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
