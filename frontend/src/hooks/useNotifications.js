import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { getEcho } from '../api/echo';
import { useAuth } from '../context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data);
      setUnreadCount(data.unread_count);
    } catch (error) {
      // Not logged in yet (no token) — this is an expected state on first
      // load, not an error worth surfacing to the user.
      if (import.meta.env.DEV) console.debug('Notifications fetch skipped:', error?.message);
    }
  }, []);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    fetchNotifications();
  };

  useEffect(() => {
    fetchNotifications();

    const echo = user ? getEcho() : null;
    if (echo && user) {
      // Real-time path: bell badge updates the instant a broadcast/notification lands.
      const channel = echo.private(`notifications.${user.id}`);
      channel.listen('.new-notification', () => fetchNotifications());
      return () => echo.leave(`notifications.${user.id}`);
    }

    // Fallback path: Reverb not configured yet -> poll every 30s so it still works.
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, user]);

  return { notifications, unreadCount, markRead, refresh: fetchNotifications };
}
