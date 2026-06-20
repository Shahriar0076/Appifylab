"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SocialShell } from "@/components/layout/social-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { api, mediaUrl, realtimeAuthOptions, realtimeUrl } from "@/lib/api";
import { timeAgo } from "@/lib/time";

type Conversation = { id: number; updatedAt: string; lastMessage: string | null; unreadCount: number; otherUser: { id: number; name: string; avatarUrl: string | null } };
type Message = { id: number; content: string; attachmentUrl: string | null; attachmentName: string | null; createdAt: string; deliveredAt: string | null; readAt: string | null; sender: { id: number; name: string; avatarUrl: string | null } };

function formatConversationTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return timeAgo(iso);
  if (diff < 172800000) return "Yesterday";
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupMessages(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toLocaleDateString();
    const last = groups[groups.length - 1];
    if (last && last.date === day) {
      last.messages.push(msg);
    } else {
      groups.push({ date: day, messages: [msg] });
    }
  }
  return groups;
}

function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("conversation"));
    if (requested) setActiveId(requested);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadConversations = useCallback(async () => {
    if (loading || !user) return;
    try {
      const data = await api<{ conversations: Conversation[] }>("/messages");
      setConversations(data.conversations);
      if (!activeId && data.conversations[0]) setActiveId(data.conversations[0].id);
    } catch {
      setConversations([]);
    }
  }, [activeId, loading, user]);

  const loadMessages = useCallback(async () => {
    if (loading || !user || !activeId) return;
    try {
      const data = await api<{ messages: Message[] }>(`/messages/${activeId}/messages`);
      setMessages(data.messages);
      setTimeout(scrollToBottom, 50);
    } catch {
      setMessages([]);
    }
  }, [activeId, loading, scrollToBottom, user]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => { void loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!user) return;
    const socket = io(realtimeUrl, realtimeAuthOptions());
    socketRef.current = socket;
    if (activeId) socket.emit("conversation:join", activeId);
    socket.on("message:new", (payload) => {
      if (payload.conversationId === activeId) void loadMessages();
      void loadConversations();
    });
    socket.on("typing:update", (payload) => {
      if (payload.conversationId === activeId && payload.userId !== user.id) setTyping(payload.typing);
    });
    socket.on("presence:snapshot", ({ userIds }) => setOnlineUsers(new Set(userIds)));
    socket.on("presence:update", ({ userId, online: isOnline }) => setOnlineUsers((current) => {
      const next = new Set(current);
      if (isOnline) next.add(userId); else next.delete(userId);
      return next;
    }));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user, activeId, loadMessages, loadConversations]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!user || !activeId || !content.trim()) return;
    const body = new FormData();
    body.append("content", content);
    if (fileRef.current?.files?.[0]) body.append("attachment", fileRef.current.files[0]);
    try {
      await api(`/messages/${activeId}/messages`, { method: "POST", body });
      setContent("");
      if (fileRef.current) fileRef.current.value = "";
      socketRef.current?.emit("typing:stop", { conversationId: activeId });
      void loadMessages();
    } catch {
      // SocialShell handles auth redirects; keep failed sends from crashing the page.
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeId);
  const filteredConversations = conversations.filter((c) =>
    c.otherUser.name.toLowerCase().includes(search.toLowerCase())
  );
  const messageGroups = groupMessages(messages);

  return (
    <SocialShell sidebars={false}>
      <div className="appify-messages">
        <aside className="appify-conversation-list">
          <div className="appify-conversation-header">
            <h2>Messages</h2>
            <span className="appify-conversation-count">{conversations.length}</span>
          </div>
          <div className="appify-conversation-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Search conversations" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button className="appify-search-clear" onClick={() => setSearch("")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <div className="appify-conversation-items">
            {filteredConversations.length === 0 ? (
              <div className="appify-conversations-empty">No conversations found</div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  className={`appify-conversation-item ${activeId === conversation.id ? "active" : ""}`}
                  key={conversation.id}
                  onClick={() => setActiveId(conversation.id)}
                >
                  <div className={`appify-conversation-avatar ${onlineUsers.has(conversation.otherUser.id) ? "online" : ""}`}>
                    <img src={mediaUrl(conversation.otherUser.avatarUrl)} alt="" />
                  </div>
                  <div className="appify-conversation-info">
                    <div className="appify-conversation-name-row">
                      <strong>{conversation.otherUser.name}</strong>
                      <span className="appify-conversation-time">{formatConversationTime(conversation.updatedAt)}</span>
                    </div>
                    <div className="appify-conversation-preview">
                      <span className={conversation.unreadCount > 0 ? "unread" : ""}>
                        {conversation.lastMessage || "\u00a0"}
                      </span>
                    </div>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="appify-unread-badge">{conversation.unreadCount}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="appify-chat-panel">
          {activeId && activeConversation ? (
            <>
              <div className="appify-chat-header">
                <div className="appify-chat-header-left">
                  <img src={mediaUrl(activeConversation.otherUser.avatarUrl)} alt="" />
                  <div>
                    <strong>{activeConversation.otherUser.name}</strong>
                    <span className={`appify-chat-status ${onlineUsers.has(activeConversation.otherUser.id) ? "" : "offline"}`}>
                      <span className="appify-chat-status-dot" />
                      {onlineUsers.has(activeConversation.otherUser.id) ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="appify-chat-messages">
                {messageGroups.map((group) => (
                  <div key={group.date}>
                    <div className="appify-date-separator">
                      <span>{formatDateSeparator(group.messages[0].createdAt)}</span>
                    </div>
                    {group.messages.map((message) => {
                      const isMine = message.sender.id === user?.id;
                      const showAvatar = !isMine && (
                        message.sender.id !== group.messages[group.messages.indexOf(message) - 1]?.sender.id
                      );
                      return (
                        <div className={`appify-message-row ${isMine ? "mine" : ""}`} key={message.id}>
                          <div className="appify-message-avatar-col">
                            {showAvatar && (
                              <img src={mediaUrl(message.sender.avatarUrl)} alt="" className="appify-message-avatar" />
                            )}
                          </div>
                          <div className="appify-message-content">
                            <div className={`appify-message-bubble ${isMine ? "mine" : ""}`}>
                              {message.content && <p>{message.content}</p>}
                              {message.attachmentUrl && (
                                <a href={mediaUrl(message.attachmentUrl)} target="_blank" className="appify-message-attachment">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                                  {message.attachmentName || "Attachment"}
                                </a>
                              )}
                            </div>
                            <div className={`appify-message-meta ${isMine ? "mine" : ""}`}>
                              <span>{timeAgo(message.createdAt)}</span>
                              {isMine && (
                                <span className="appify-message-status">
                                  {message.readAt ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L9 17l-5-5"/><path d="M22 6l-9 11-2.5-2.5"/></svg>
                                  ) : message.deliveredAt ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L9 17l-5-5"/></svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {typing && (
                  <div className="appify-message-row">
                    <div className="appify-message-avatar-col">
                      <img src={mediaUrl(activeConversation.otherUser.avatarUrl)} alt="" className="appify-message-avatar" />
                    </div>
                    <div className="appify-message-content">
                      <div className="appify-message-bubble typing">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="appify-message-form" onSubmit={send}>
                <button type="button" className="appify-attach-btn" onClick={() => fileRef.current?.click()} title="Attach file">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                </button>
                <input ref={fileRef} type="file" className="appify-file-input" />
                <input
                  className="appify-message-input"
                  value={content}
                  placeholder="Type a message..."
                  onFocus={() => activeId && socketRef.current?.emit("typing:start", { conversationId: activeId })}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (activeId) socketRef.current?.emit("typing:start", { conversationId: activeId });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const form = (e.target as HTMLElement).closest("form");
                      if (form) form.requestSubmit();
                    }
                  }}
                />
                <button className="appify-send-btn" disabled={!content.trim()} type="submit" title="Send">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </form>
            </>
          ) : (
            <div className="appify-chat-empty">
              <div className="appify-chat-empty-icon">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <h3>Your Messages</h3>
              <p>Select a conversation from the sidebar to start chatting</p>
            </div>
          )}
        </section>
      </div>
    </SocialShell>
  );
}
