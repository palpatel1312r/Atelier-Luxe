import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { formatDate } from "../lib/format";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { unread, refreshUnread } = useNotifications();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Load items when opening or switching tabs
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    api
      .getNotifications({
        unread: tab === "unread" ? "1" : undefined,
        per_page: 30,
      })
      .then((res) => {
        if (!cancelled) setItems(res.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, user]);

  if (!user) return null;

  const handleClick = async (n: Notification) => {
    try {
      if (!n.is_read) {
        await api.markNotificationRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
        );
        refreshUnread();
      }
    } catch {
      /* silent */
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      refreshUnread();
    } catch {
      /* silent */
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      refreshUnread();
    } catch {
      /* silent */
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-stone-700 hover:text-amber-800 transition-colors"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-medium min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white border border-stone-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTab("unread")}
                className={`text-xs tracking-wider uppercase pb-1 border-b-2 transition-colors ${
                  tab === "unread"
                    ? "border-amber-800 text-amber-800"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setTab("all")}
                className={`text-xs tracking-wider uppercase pb-1 border-b-2 transition-colors ${
                  tab === "all"
                    ? "border-amber-800 text-amber-800"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                All
              </button>
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-stone-500 hover:text-amber-800 underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <p className="p-6 text-sm text-stone-500 text-center">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-sm text-stone-500 text-center">
                {tab === "unread"
                  ? "You're all caught up."
                  : "No notifications yet."}
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {items.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors ${
                      !n.is_read ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                          !n.is_read ? "bg-amber-800" : "bg-transparent"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-800 leading-snug">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-stone-500 mt-1 leading-snug">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-wider">
                          {formatDate(n.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        aria-label="Delete"
                        className="text-stone-300 hover:text-red-500 transition-colors p-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
