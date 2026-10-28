import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import AdminLayout from "../../components/AdminLayout";
import api from "../../api/client";
import MessageTick from "../../components/MessageTick";
import "../../styles/admin-common.css";
import "../../styles/chat.css";
import "../../styles/admin-chat.css";

/* ---------- helpers ---------- */
const initialsOf = (name) =>
    (name || "?")
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatListTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    const now = new Date();
    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();

    if (sameDay) {
        return d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "2-digit", month: "short" });
};

const formatDay = (value) => {
    if (!value) return "";
    const d = new Date(value);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (sameDay(d, today)) return "Today";
    if (sameDay(d, yesterday)) return "Yesterday";
    return d.toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
    });
};

const sameDayAs = (a, b) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return (
        da.getFullYear() === db.getFullYear() &&
        da.getMonth() === db.getMonth() &&
        da.getDate() === db.getDate()
    );
};

/* deterministic hue per dealer id so the avatar colors stay stable */
const hueOf = (seed) => {
    const s = String(seed ?? "");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return h;
};

const avatarStyle = (seed) => {
    const h = hueOf(seed);
    return {
        background: `hsl(${h} 55% 92%)`,
        color: `hsl(${h} 55% 28%)`,
        borderColor: `hsl(${h} 45% 78%)`,
    };
};

export default function AdminChat() {
    const [conversations, setConversations] = useState([]);
    const [activeDealer, setActiveDealer] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [threadLoading, setThreadLoading] = useState(false);
    const [error, setError] = useState("");

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const messagesRef = useRef(null);

    /* ---------- conversations ---------- */
    const loadConversations = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/chat/conversations");
            setConversations(data.data);
        } catch (err) {
            console.error("Failed to load conversations:", err);
        }
    }, []);

    useEffect(() => {
        loadConversations();
        const interval = setInterval(loadConversations, 30000);
        return () => clearInterval(interval);
    }, [loadConversations]);

    /* ---------- thread ---------- */
    const loadThread = useCallback(async (dealer) => {
        setActiveDealer(dealer);
        setShowMobileSidebar(false);
        setThreadLoading(true);
        setError("");
        try {
            const { data } = await api.get(`/chat/${dealer.dealer_id}`);
            setMessages(data.data);
        } catch (err) {
            console.error("Failed to load thread:", err);
            setError("Could not load messages.");
        } finally {
            setThreadLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!activeDealer) return;
        const interval = setInterval(() => {
            api.get(`/chat/${activeDealer.dealer_id}`)
                .then(({ data }) => setMessages(data.data))
                .catch(console.error);
        }, 10000);
        return () => clearInterval(interval);
    }, [activeDealer]);

    /* ---------- scroll ---------- */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: messages.length > 1 ? "smooth" : "auto",
            block: "end",
        });
    }, [messages, isTyping]);

    /* ---------- focus input on thread open ---------- */
    useEffect(() => {
        if (activeDealer) {
            const t = setTimeout(() => inputRef.current?.focus(), 120);
            return () => clearTimeout(t);
        }
    }, [activeDealer]);

    /* ---------- typing ---------- */
    const handleTyping = (value) => {
        setText(value);
        if (!activeDealer) return;

        if (value.length > 0 && !typing) {
            setTyping(true);
            api.post("/chat/typing", {
                receiver_id: activeDealer.dealer_id,
                is_typing: true,
            }).catch(() => {});
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            if (typing) {
                setTyping(false);
                api.post("/chat/typing", {
                    receiver_id: activeDealer.dealer_id,
                    is_typing: false,
                }).catch(() => {});
            }
        }, 2000);
    };

    /* ---------- send ---------- */
    const send = async (e) => {
        e?.preventDefault();
        if (!text.trim() || !activeDealer || sending) return;

        setSending(true);
        try {
            const { data } = await api.post("/chat", {
                receiver_id: activeDealer.dealer_id,
                message_text: text,
            });

            setMessages((prev) => [...prev, data.data]);
            setText("");

            if (typing) {
                setTyping(false);
                api.post("/chat/typing", {
                    receiver_id: activeDealer.dealer_id,
                    is_typing: false,
                }).catch(() => {});
            }

            loadConversations();
        } catch (err) {
            console.error("Failed to send message:", err);
            setError("Message could not be sent. Please try again.");
            setTimeout(() => setError(""), 4000);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    /* ---------- filtering / sorting ---------- */
    const sortedConversations = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const filtered = !q
            ? conversations
            : conversations.filter(
                  (c) =>
                      c.dealer_name?.toLowerCase().includes(q) ||
                      c.company_name?.toLowerCase().includes(q),
              );

        return [...filtered].sort((a, b) => {
            if ((a.unread_count ?? 0) > 0 && (b.unread_count ?? 0) === 0)
                return -1;
            if ((a.unread_count ?? 0) === 0 && (b.unread_count ?? 0) > 0)
                return 1;
            return (
                new Date(b.last_message_at ?? 0) -
                new Date(a.last_message_at ?? 0)
            );
        });
    }, [conversations, searchQuery]);

    const unreadCount = useMemo(
        () => conversations.filter((c) => (c.unread_count ?? 0) > 0).length,
        [conversations],
    );

    /* ---------- render ---------- */
    return (
        <AdminLayout>
            <div className="admin-page__header admin-chat__page-head">
                <div>
                    <p className="admin-chat__eyebrow">Support inbox</p>
                    <h1 className="admin-page__title">Dealer chat</h1>
                    <p className="admin-page__subtitle">
                        {unreadCount > 0
                            ? `${unreadCount} conversation${
                                  unreadCount === 1 ? "" : "s"
                              } awaiting reply`
                            : "You're all caught up."}
                    </p>
                </div>
                <button
                    type="button"
                    className="admin-btn admin-btn--outline admin-btn--sm admin-chat__mobile-toggle"
                    onClick={() => setShowMobileSidebar((v) => !v)}
                    aria-label="Toggle conversations list"
                    aria-expanded={showMobileSidebar}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    >
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                    <span>Conversations</span>
                </button>
            </div>

            <div className="admin-chat">
                {/* ---------- Sidebar ---------- */}
                <aside
                    className={`admin-chat__sidebar ${
                        showMobileSidebar ? "admin-chat__sidebar--visible" : ""
                    }`}
                >
                    <div className="admin-chat__search">
                        <span className="admin-chat__search-icon">
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Search dealers…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search conversations"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="admin-chat__search-clear"
                                onClick={() => setSearchQuery("")}
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    <div className="admin-chat__list">
                        {sortedConversations.length === 0 ? (
                            <div className="admin-chat__empty">
                                <div className="admin-chat__empty-icon">
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                    >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <p>
                                    {searchQuery
                                        ? "No dealers match your search."
                                        : "No conversations yet."}
                                </p>
                            </div>
                        ) : (
                            sortedConversations.map((c) => {
                                const active =
                                    activeDealer?.dealer_id === c.dealer_id;
                                return (
                                    <button
                                        type="button"
                                        key={c.dealer_id}
                                        onClick={() => loadThread(c)}
                                        className={`admin-chat__conversation ${
                                            active
                                                ? "admin-chat__conversation--active"
                                                : ""
                                        } ${
                                            c.unread_count > 0
                                                ? "admin-chat__conversation--unread"
                                                : ""
                                        }`}
                                    >
                                        <span
                                            className="admin-chat__avatar"
                                            style={avatarStyle(c.dealer_id)}
                                            aria-hidden="true"
                                        >
                                            {initialsOf(c.dealer_name)}
                                        </span>

                                        <span className="admin-chat__conversation-info">
                                            <span className="admin-chat__conversation-top">
                                                <span className="admin-chat__conversation-name">
                                                    {c.dealer_name}
                                                </span>
                                                <span className="admin-chat__conversation-time">
                                                    {formatListTime(
                                                        c.last_message_at,
                                                    )}
                                                </span>
                                            </span>

                                            {c.company_name && (
                                                <span className="admin-chat__conversation-company">
                                                    {c.company_name}
                                                </span>
                                            )}

                                            <span className="admin-chat__conversation-bottom">
                                                <span className="admin-chat__conversation-preview">
                                                    {c.last_message ||
                                                        "No messages yet"}
                                                </span>
                                                {c.unread_count > 0 && (
                                                    <span className="admin-chat__unread-badge">
                                                        {c.unread_count}
                                                    </span>
                                                )}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* ---------- Thread ---------- */}
                <section className="admin-chat__thread">
                    {!activeDealer ? (
                        <div className="admin-chat__placeholder">
                            <div className="admin-chat__placeholder-icon">
                                <svg
                                    width="36"
                                    height="36"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <h2>Your support inbox</h2>
                            <p>
                                Select a conversation on the left to view
                                messages and reply.
                            </p>
                        </div>
                    ) : (
                        <>
                            <header className="admin-chat__thread-header">
                                <button
                                    type="button"
                                    className="admin-chat__back"
                                    onClick={() => {
                                        setActiveDealer(null);
                                        setShowMobileSidebar(true);
                                    }}
                                    aria-label="Back to conversations"
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                <span
                                    className="admin-chat__avatar admin-chat__avatar--lg"
                                    style={avatarStyle(activeDealer.dealer_id)}
                                    aria-hidden="true"
                                >
                                    {initialsOf(activeDealer.dealer_name)}
                                </span>

                                <div className="admin-chat__dealer-info">
                                    <h3>{activeDealer.dealer_name}</h3>
                                    {activeDealer.company_name && (
                                        <p>{activeDealer.company_name}</p>
                                    )}
                                </div>
                            </header>

                            {error && (
                                <div className="admin-chat__alert" role="alert">
                                    {error}
                                </div>
                            )}

                            <div
                                className="chat-page__messages admin-chat__messages"
                                ref={messagesRef}
                            >
                                {threadLoading && messages.length === 0 && (
                                    <div className="admin-chat__loading">
                                        <span />
                                        <span />
                                        <span />
                                    </div>
                                )}

                                {!threadLoading && messages.length === 0 && (
                                    <div className="admin-chat__thread-empty">
                                        <p>
                                            No messages yet. Say hi to{" "}
                                            {activeDealer.dealer_name}.
                                        </p>
                                    </div>
                                )}

                                {messages.map((m, index) => {
                                    const isMe =
                                        m.sender_id !== activeDealer.dealer_id;
                                    const prev = messages[index - 1];
                                    const next = messages[index + 1];

                                    const showDayDivider =
                                        index === 0 ||
                                        !sameDayAs(
                                            prev?.created_at,
                                            m.created_at,
                                        );

                                    const prevSameSender =
                                        prev &&
                                        prev.sender_id === m.sender_id &&
                                        !showDayDivider;

                                    const nextSameSender =
                                        next &&
                                        next.sender_id === m.sender_id &&
                                        sameDayAs(
                                            m.created_at,
                                            next.created_at,
                                        );

                                    const groupStart = !prevSameSender;
                                    const groupEnd = !nextSameSender;

                                    return (
                                        <div
                                            key={m.id}
                                            className={`chat-row ${
                                                isMe
                                                    ? "chat-row--sent"
                                                    : "chat-row--received"
                                            }`}
                                        >
                                            {showDayDivider && (
                                                <div className="chat-day">
                                                    <span>
                                                        {formatDay(
                                                            m.created_at,
                                                        )}
                                                    </span>
                                                </div>
                                            )}

                                            <div
                                                className={[
                                                    "chat-bubble",
                                                    isMe
                                                        ? "chat-bubble--sent"
                                                        : "chat-bubble--received",
                                                    groupStart
                                                        ? "chat-bubble--group-start"
                                                        : "",
                                                    groupEnd
                                                        ? "chat-bubble--group-end"
                                                        : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                            >
                                                {!isMe && (
                                                    <div
                                                        className={`chat-bubble__avatar ${
                                                            groupStart
                                                                ? ""
                                                                : "chat-bubble__avatar--hidden"
                                                        }`}
                                                        style={avatarStyle(
                                                            activeDealer.dealer_id,
                                                        )}
                                                        aria-hidden={
                                                            !groupStart
                                                        }
                                                    >
                                                        {groupStart
                                                            ? initialsOf(
                                                                  activeDealer.dealer_name,
                                                              )
                                                            : ""}
                                                    </div>
                                                )}

                                                <div className="chat-bubble__content">
                                                    {m.message_text && (
                                                        <p className="chat-bubble__text">
                                                            {m.message_text}
                                                        </p>
                                                    )}

                                                    {m.attachments?.map((a) => (
                                                        <img
                                                            key={a.id}
                                                            src={a.file_path}
                                                            alt="attachment"
                                                            className="chat-bubble__image"
                                                            onClick={() =>
                                                                window.open(
                                                                    a.file_path,
                                                                    "_blank",
                                                                )
                                                            }
                                                        />
                                                    ))}

                                                    {groupEnd && (
                                                        <div className="chat-bubble__meta">
                                                            <span className="chat-bubble__time">
                                                                {formatTime(
                                                                    m.created_at,
                                                                )}
                                                            </span>
                                                            {isMe && (
                                                                <MessageTick
                                                                    tick={
                                                                        m.status ||
                                                                        m.tick ||
                                                                        "sent"
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {isTyping && (
                                    <div className="chat-row chat-row--received">
                                        <div className="chat-bubble chat-bubble--received chat-bubble--typing">
                                            <div
                                                className="chat-bubble__avatar"
                                                style={avatarStyle(
                                                    activeDealer.dealer_id,
                                                )}
                                            >
                                                {initialsOf(
                                                    activeDealer.dealer_name,
                                                )}
                                            </div>
                                            <div className="chat-bubble__content">
                                                <div className="typing-indicator">
                                                    <span />
                                                    <span />
                                                    <span />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={bottomRef} />
                            </div>

                            <form
                                className="admin-chat__composer"
                                onSubmit={send}
                            >
                                <div className="chat-input-wrapper">
                                    <textarea
                                        ref={inputRef}
                                        value={text}
                                        onChange={(e) =>
                                            handleTyping(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        placeholder="Write a reply…"
                                        rows={1}
                                        className="chat-input"
                                        maxLength={2000}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!text.trim() || sending}
                                        className="chat-send-btn"
                                        aria-label="Send message"
                                    >
                                        {sending ? (
                                            <span className="loading-spinner" />
                                        ) : (
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <line
                                                    x1="22"
                                                    y1="2"
                                                    x2="11"
                                                    y2="13"
                                                />
                                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
