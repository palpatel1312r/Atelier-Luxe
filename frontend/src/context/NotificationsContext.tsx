import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { api, getToken } from "../lib/api";
import { useAuth } from "./AuthContext";

interface NotificationsContextValue {
  unread: number;
  refreshUnread: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

const POLL_MS = 60_000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user || !getToken()) {
      setUnread(0);
      return;
    }
    try {
      const { unread } = await api.getUnreadNotificationCount();
      setUnread(unread);
    } catch {
      /* silent — auth errors, network blips */
    }
  }, [user]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) setUnread(0);
  }, [user]);

  // Poll while logged in
  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const t = window.setInterval(refreshUnread, POLL_MS);
    const onFocus = () => refreshUnread();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, refreshUnread]);

  return (
    <NotificationsContext.Provider value={{ unread, refreshUnread }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used inside <NotificationsProvider>",
    );
  return ctx;
}
