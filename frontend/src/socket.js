import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const configuredUrl = import.meta.env.VITE_SOCKET_URL;
  const isLocalHost = (hostname) => ['localhost', '127.0.0.1'].includes(hostname);
  const configuredHost = configuredUrl
    ? new URL(configuredUrl, window.location.origin).hostname
    : null;
  const url = configuredUrl && !isLocalHost(configuredHost)
    ? configuredUrl
    : isLocalHost(window.location.hostname)
      ? configuredUrl || `http://${window.location.hostname}:5000`
      : window.location.origin;

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
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
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
