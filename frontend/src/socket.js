/**
 * Single socket.io instance for the entire app.
 * Import getSocket() anywhere — it always returns the current instance.
 * Call initSocket(token) on login, destroySocket() on logout.
 */
import { io } from 'socket.io-client';

let socket = null;
const listeners = new Set(); // components waiting for socket ready

export const initSocket = (token) => {
  if (socket?.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }

  const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    listeners.forEach((cb) => cb(socket));
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Error:', err.message);
  });

  return socket;
};

export const destroySocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const getSocket = () => socket;

/**
 * Returns socket immediately if connected, otherwise waits for connect.
 * Calls cb(socket) as soon as socket is ready.
 */
export const whenConnected = (cb) => {
  if (socket?.connected) { cb(socket); return; }
  listeners.add(cb);
  // Auto-cleanup after 10s to avoid leaks
  setTimeout(() => listeners.delete(cb), 10000);
};
