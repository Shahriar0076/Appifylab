"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SocialShell } from "@/components/layout/social-shell";
import { api, mediaUrl } from "@/lib/api";
import { eventPath, profilePath } from "@/lib/routes";

type Event = { id: number; slug: string; title: string; description: string; imageUrl: string | null; startsAt: string; location: string; attendance: string | null; attendees: Array<{ id: number; username: string; name: string; avatarUrl: string | null; status: string }> };

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function EventPage() {
  const identifier = String(useParams().id);
  const router = useRouter();
  const [item, setItem] = useState<Event | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: number; username: string; name: string; avatarUrl: string | null }>>([]);
  const [inviting, setInviting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!inviteQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const data = await api<{ users: Array<{ id: number; username: string; name: string; avatarUrl: string | null }> }>(`/search?q=${encodeURIComponent(inviteQuery.trim())}`);
      setSearchResults(data.users);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [inviteQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function inviteUser(userId: number) {
    setInviting(true);
    await api(`/events/${encodeURIComponent(identifier)}/invite`, { method: "POST", body: JSON.stringify({ userId }) });
    setInviteQuery("");
    setSearchResults([]);
    setShowResults(false);
    setInviting(false);
    void load();
  }
  const load = useCallback(async () => { const data = await api<{ event: Event }>(`/events/${encodeURIComponent(identifier)}`); setItem(data.event); const canonical = eventPath(data.event); if (canonical !== `/events/${identifier}`) router.replace(canonical); }, [identifier, router]);
  useEffect(() => { void load(); }, [load]);
  if (!item) return <SocialShell><div className="appify-feed-loading">Loading event...</div></SocialShell>;
  const goingCount = item.attendees.filter((a) => a.status === "going").length;
  return (
    <SocialShell>
      <section className="appify-page-card appify-event-detail-card">
        {item.imageUrl && (
          <div className="appify-event-cover">
            <img src={mediaUrl(item.imageUrl)} alt="" />
          </div>
        )}
        <div className="appify-event-info">
          <h2 className="appify-event-title">{item.title}</h2>
          {item.description && <p className="appify-event-desc">{item.description}</p>}
          <div className="appify-event-meta">
            <div className="appify-event-meta-row">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg>
              <span>{formatDate(item.startsAt)}</span>
            </div>
            {item.location && <div className="appify-event-meta-row">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2C20 17.5 12 22 12 22z" /><circle cx="12" cy="10" r="3" /></svg>
              <span>{item.location}</span>
            </div>}
          </div>
          <div className="appify-event-actions-row">
            {goingCount > 0 && <p className="appify-event-going-count"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>{goingCount} {goingCount === 1 ? "person" : "people"} going</p>}
            <button className="appify-event-attend-btn" onClick={async () => { await api(`/events/${item.slug}/attendance`, { method: "POST", body: JSON.stringify({ status: item.attendance === "going" ? "not_going" : "going" }) }); void load(); }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              {item.attendance === "going" ? "Not Going" : "Going"}
            </button>
          </div>
        </div>
      </section>

      <section className="appify-page-card">
        <div className="appify-page-card-header">
          <div className="appify-page-card-header-left">
            <div className="appify-page-card-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
            </div>
            <div>
              <h3>Invite People</h3>
              <p className="appify-page-card-subtitle">Search for someone to invite to this event</p>
            </div>
          </div>
        </div>
        <div className="appify-invite-search-section" ref={searchRef}>
          <div className="appify-invite-search-wrap">
            <svg className="appify-invite-search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="appify-invite-search-input" type="text" placeholder="Type a name or @username..." value={inviteQuery} onChange={(e) => { setInviteQuery(e.target.value); setShowResults(true); }} onFocus={() => { if (searchResults.length) setShowResults(true); }} />
            {inviteQuery && <button className="appify-invite-search-clear" type="button" onClick={() => { setInviteQuery(""); setSearchResults([]); setShowResults(false); }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>}
          </div>
          {showResults && (
            <div className="appify-invite-results-dropdown">
              {searchResults.length > 0 ? searchResults.slice(0, 6).map((u) => (
                <button key={u.id} className="appify-invite-result-item" type="button" onClick={() => inviteUser(u.id)} disabled={inviting}>
                  <img src={mediaUrl(u.avatarUrl)} alt="" className="appify-invite-result-avatar" />
                  <div className="appify-invite-result-text">
                    <strong>{u.name}</strong>
                    <span>@{u.username}</span>
                  </div>
                  <span className="appify-invite-result-action">{inviting ? "Inviting..." : "Invite"}<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg></span>
                </button>
              )) : inviteQuery.trim() ? (
                <div className="appify-invite-no-results">No users found matching &quot;<strong>{inviteQuery}</strong>&quot;</div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="appify-page-card">
        <div className="appify-page-card-header">
          <div className="appify-page-card-header-left">
            <div className="appify-page-card-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
            <div>
              <h3>Attendees</h3>
              <p className="appify-page-card-subtitle">{item.attendees.length} {item.attendees.length === 1 ? "person has" : "people have"} responded</p>
            </div>
          </div>
        </div>
        {item.attendees.length === 0 ? (
          <div className="appify-attendees-empty">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ccc" strokeWidth="1.2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            <p>No attendees yet. Invite someone above!</p>
          </div>
        ) : (
          <div className="appify-attendee-grid">
            {item.attendees.map((person) => (
              <div key={person.id} className="appify-attendee-card">
                <div className="appify-attendee-avatar">
                  <img src={mediaUrl(person.avatarUrl)} alt="" />
                </div>
                <div className="appify-attendee-info">
                  <button className="appify-attendee-name" onClick={() => router.push(profilePath(person))}>{person.name}</button>
                  <span className={`appify-attendee-badge appify-attendee-badge--${person.status}`}>{person.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </SocialShell>
  );
}
