import Echo from 'laravel-echo';
import Pusher from 'pusher-js';


let echoInstance = null;

export function getEcho() {
  if (echoInstance) return echoInstance;

  const key = import.meta.env.VITE_REVERB_APP_KEY;
  if (!key) return null; // Reverb not configured yet — caller should poll instead

  window.Pusher = Pusher;

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    // 🔥 FIX: Hardcode the authEndpoint to match your backend baseURL
    authEndpoint: 'http://abctraders.localhost:8000/api/broadcasting/auth',
    auth: {
      headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
    },
  });

  return echoInstance;
}

export function disconnectEcho() {
  echoInstance?.disconnect();
  echoInstance = null;
}