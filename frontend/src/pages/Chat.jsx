import { useEffect, useRef, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/client";
import { getEcho } from "../api/echo";
import { useAuth } from "../context/AuthContext";
import "../styles/chat.css";
import MessageTick from "../components/MessageTick";

/* ---------- helpers ---------- */
const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
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

const initialsOf = (name) =>
    (name || "?")
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

export default function Chat() {
    const { user } = useAuth();
    const [contact, setContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const messagesRef = useRef(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    /* ---------- load contact ---------- */
    useEffect(() => {
        let cancelled = false;
        api.get("/chat-contact/admin")
            .then(({ data }) => {
                if (cancelled) return;
                setContact(data.data);
                setIsOnline(true);
            })
            .catch(() => {
                if (cancelled) return;
                setIsOnline(false);
                setError("Could not load support contact.");
            })
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, []);

    /* ---------- load messages ---------- */
    const loadMessages = useCallback(async () => {
        if (!contact) return;
        try {
            const { data } = await api.get(`/chat/${contact.id}`);
            setMessages(data.data);
        } catch (err) {
            console.error("Failed to load messages:", err);
        }
    }, [contact]);

    /* ---------- subscribe to echo ---------- */
    useEffect(() => {
        if (!contact || !user) return;

        loadMessages();

        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private(`chat.${user.id}`);

        channel.listen(".new-message", (e) => {
            if (e.message.sender_id === contact.id) {
                loadMessages();
                markAsRead(e.message.id);
            }
        });

        channel.listen(".message.read", () => {
            setMessages((prev) =>
                prev.map((m) =>
                    m.sender_id === user.id ? { ...m, status: "read" } : m,
                ),
            );
        });

        channel.listen(".typing.started", (e) => {
            if (e.userId === contact.id) setIsTyping(true);
        });

        channel.listen(".typing.stopped", (e) => {
            if (e.userId === contact.id) setIsTyping(false);
        });

        return () => {
            echo.leave(`chat.${user.id}`);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contact, user, loadMessages]);

    /* ---------- auto-scroll ---------- */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: messages.length > 1 ? "smooth" : "auto",
            block: "end",
        });
    }, [messages, isTyping]);

    /* ---------- focus input once contact is ready ---------- */
    useEffect(() => {
        if (contact) {
            // small delay so the layout has settled
            const t = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(t);
        }
    }, [contact]);

    /* ---------- typing indicator ---------- */
    const handleTyping = (value) => {
        setText(value);
        if (!contact) return;

        if (value.length > 0 && !typing) {
            setTyping(true);
            api.post("/chat/typing", {
                receiver_id: contact.id,
                is_typing: true,
            }).catch(() => {});
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            if (typing) {
                setTyping(false);
                api.post("/chat/typing", {
                    receiver_id: contact.id,
                    is_typing: false,
                }).catch(() => {});
            }
        }, 2000);
    };

    /* ---------- mark delivered ---------- */
    const markAsRead = async (messageId) => {
        try {
            await api.post(`/chat/${messageId}/delivered`);
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    /* ---------- send ---------- */
    const send = async (e) => {
        e?.preventDefault();
        if (!text.trim() || !contact || sending) return;

        setSending(true);
        try {
            const { data } = await api.post("/chat", {
                receiver_id: contact.id,
                message_text: text,
            });

            setMessages((prev) => [...prev, data.data]);
            setText("");

            if (typing) {
                setTyping(false);
                api.post("/chat/typing", {
                    receiver_id: contact.id,
                    is_typing: false,
                }).catch(() => {});
            }
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

    /* ---------- render ---------- */
    return (
        <Layout>
            <div className="chat-page">
                {/* Header */}
                <header className="chat-header">
                    <div className="chat-header__info">
                        <div className="chat-header__avatar">
                            {contact?.name ? (
                                initialsOf(contact.name)
                            ) : (
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div className="chat-header__body">
                            <h1 className="chat-header__title">
                                {contact?.name || "Admin Support"}
                            </h1>
                            <p className="chat-header__status">
                                <span
                                    className={`status-dot ${
                                        isOnline
                                            ? "status-dot--online"
                                            : "status-dot--offline"
                                    }`}
                                />
                                {isOnline ? "Online" : "Offline"}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Body */}
                {loading ? (
                    <div className="chat-page__loading">
                        <div className="chat-skeleton-row chat-skeleton-row--left">
                            <div className="chat-skeleton-bubble" />
                        </div>
                        <div className="chat-skeleton-row chat-skeleton-row--right">
                            <div className="chat-skeleton-bubble chat-skeleton-bubble--short" />
                        </div>
                        <div className="chat-skeleton-row chat-skeleton-row--left">
                            <div className="chat-skeleton-bubble chat-skeleton-bubble--tall" />
                        </div>
                    </div>
                ) : !contact ? (
                    <div className="chat-page__empty">
                        <div className="chat-page__empty-icon">
                            <svg
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h2>No admin available</h2>
                        <p>
                            There's no support agent to chat with right now.
                            Please try again later.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Error toast */}
                        {error && (
                            <div className="chat-alert" role="alert">
                                {error}
                            </div>
                        )}

                        {/* Messages */}
                        <div className="chat-page__messages" ref={messagesRef}>
                            {messages.length === 0 && !isTyping && (
                                <div className="chat-page__start">
                                    <div className="chat-page__start-icon">
                                        <svg
                                            width="28"
                                            height="28"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        >
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <p>
                                        Start the conversation with{" "}
                                        {contact.name}.
                                    </p>
                                </div>
                            )}

                            {messages.map((m, index) => {
                                const isMe = m.sender_id === user?.id;
                                const prev = messages[index - 1];
                                const next = messages[index + 1];

                                const showDayDivider =
                                    index === 0 ||
                                    !sameDayAs(prev?.created_at, m.created_at);

                                const prevSameSender =
                                    prev &&
                                    prev.sender_id === m.sender_id &&
                                    !showDayDivider;

                                const nextSameSender =
                                    next &&
                                    next.sender_id === m.sender_id &&
                                    sameDayAs(m.created_at, next.created_at);

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
                                                    {formatDay(m.created_at)}
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
                                                    aria-hidden={!groupStart}
                                                >
                                                    {groupStart
                                                        ? initialsOf(
                                                              contact.name,
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

                            {/* Typing indicator */}
                            {isTyping && (
                                <div className="chat-bubble chat-bubble--received chat-bubble--typing">
                                    <div className="chat-bubble__avatar">
                                        {initialsOf(contact.name)}
                                    </div>
                                    <div className="chat-bubble__content">
                                        <div className="typing-indicator">
                                            <span />
                                            <span />
                                            <span />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <form className="chat-page__input-row" onSubmit={send}>
                            <div className="chat-input-wrapper">
                                <textarea
                                    ref={inputRef}
                                    value={text}
                                    onChange={(e) =>
                                        handleTyping(e.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    placeholder="Write a message…"
                                    rows={1}
                                    className="chat-input"
                                    maxLength={2000}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !text.trim()}
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
                            <p className="chat-input-hint">
                                <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+
                                <kbd>Enter</kbd> for a new line
                            </p>
                        </form>
                    </>
                )}
            </div>
        </Layout>
    );
}
