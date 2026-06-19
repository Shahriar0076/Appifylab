"use client";

import { useCallback, useEffect, useState } from "react";
import { SocialShell } from "@/components/layout/social-shell";
import { ResourceCard } from "@/components/features/resource-card";
import { api } from "@/lib/api";
import { profilePath } from "@/lib/routes";

type Notification = { id: number; message: string; type: string; isRead: boolean; createdAt: string; actor: { id: number; username: string; name: string; avatarUrl: string | null } | null };

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(false);
  const load = useCallback(async () => { const data = await api<{ notifications: Notification[] }>(`/notifications?unread=${unread}`); setItems(data.notifications); }, [unread]);
  useEffect(() => { void load(); }, [load]);
  return <SocialShell><section className="appify-page-card appify-page-heading"><div style={{ display: "flex", alignItems: "center", gap: 12 }}><h2>Notifications</h2><button className="appify-link-button" onClick={() => setUnread((v) => !v)}>{unread ? "Show all" : "Unread only"}</button></div><button className="appify-comment-submit" onClick={async () => { await api("/notifications/read-all", { method: "PATCH" }); void load(); }}>Mark all read</button></section>
    {items.map((item) => <ResourceCard key={item.id} title={item.actor?.name || "Appify"} subtitle={`${item.message} · ${item.createdAt}`} imageUrl={item.actor?.avatarUrl} href={item.actor ? profilePath(item.actor) : undefined}><button className="appify-secondary-button" disabled={item.isRead} onClick={async () => { await api(`/notifications/${item.id}/read`, { method: "PATCH" }); void load(); }}>{item.isRead ? "Read" : "Mark read"}</button></ResourceCard>)}
  </SocialShell>;
}
