"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SocialShell } from "@/components/layout/social-shell";
import { api, mediaUrl } from "@/lib/api";
import { eventPath } from "@/lib/routes";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";

type Event = { id: number; slug: string; title: string; description: string; imageUrl: string | null; startsAt: string; location: string; attendeeCount: number; attendance: string | null };

export default function EventsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState({ title: "", description: "", location: "", startsAt: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load() {
    const data = await api<{ events: Event[]; nextCursor: number | null }>("/events?limit=3");
    setEvents(data.events);
    setNextCursor(data.nextCursor);
  }
  useEffect(() => { void load(); }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<{ events: Event[]; nextCursor: number | null }>(`/events?limit=3&cursor=${nextCursor}`);
      setEvents((items) => [...items, ...data.events]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  const loadMoreRef = useInfiniteScroll(loadMore, Boolean(nextCursor));

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (imageFile) body.append("image", imageFile);
    await api("/events", { method: "POST", body });
    setForm({ title: "", description: "", location: "", startsAt: "" });
    removeImage();
    void load();
  }

  return <SocialShell>
    <div className="appify-page-card">
      <h2>Create Event</h2>
      <form className="appify-event-form" onSubmit={create}>
        <div className="appify-event-form-row">
          <div className="appify-event-form-group">
            <label className="appify-event-form-label">Event title</label>
            <input className="form-control appify-event-input" placeholder="Add a short, clear title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="appify-event-form-group">
            <label className="appify-event-form-label">Location</label>
            <input className="form-control appify-event-input" placeholder="Add event location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>
        <div className="appify-event-form-group">
          <label className="appify-event-form-label">Date & Time</label>
          <input className="form-control appify-event-input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
        </div>
        <div className="appify-event-form-group">
          <label className="appify-event-form-label">Description</label>
          <textarea className="form-control appify-event-textarea" placeholder="Tell people more about your event" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="appify-event-form-group">
          <label className="appify-event-form-label">Event image</label>
          <input ref={fileInputRef} className="appify-event-file-input" type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview ? (
            <div className="appify-event-image-preview">
              <img src={imagePreview} alt="Preview" />
              <button type="button" className="appify-event-image-remove" onClick={removeImage}>&times;</button>
            </div>
          ) : (
            <button type="button" className="appify-event-image-picker" onClick={() => fileInputRef.current?.click()}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path strokeLinecap="round" d="M21 15l-5-5L5 21" /></svg>
              <span>Add event image</span>
            </button>
          )}
        </div>
        <button className="appify-event-submit-btn" type="submit">Create Event</button>
      </form>
    </div>
    <div className="appify-events-grid">
      <h2 className="appify-events-heading">Upcoming Events</h2>
      {events.length === 0 ? <p className="appify-events-empty">No events yet. Create one above!</p> : events.map((item) => {
        const startDate = new Date(item.startsAt);
        const isPast = startDate < new Date();
        return <div className={`appify-event-card ${isPast ? "past" : ""}`} key={item.id}>
          <div className="appify-event-card-image">
            {item.imageUrl ? <img src={mediaUrl(item.imageUrl)} alt="" /> : <div className="appify-event-card-placeholder"><svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg></div>}
            <div className="appify-event-card-date">
              <span className="appify-event-card-date-day">{startDate.getDate()}</span>
              <span className="appify-event-card-date-month">{startDate.toLocaleString("en", { month: "short" })}</span>
            </div>
          </div>
          <div className="appify-event-card-body">
            <h3 className="appify-event-card-title"><button className="appify-link-button" onClick={() => router.push(eventPath(item))}>{item.title}</button></h3>
            <div className="appify-event-card-meta">
              {item.location && <span><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2C20 17.5 12 22 12 22z" /><circle cx="12" cy="10" r="3" /></svg>{item.location}</span>}
              <span><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>{item.attendeeCount} going</span>
            </div>
            <p className="appify-event-card-desc">{item.description}</p>
            <div className="appify-event-card-actions">
              <button className="appify-event-card-btn primary" onClick={async () => { await api(`/events/${item.slug}/attendance`, { method: "POST", body: JSON.stringify({ status: item.attendance === "going" ? "not_going" : "going" }) }); void load(); }}>{item.attendance === "going" ? "Not Going" : "Going"}</button>
              <button className="appify-event-card-btn secondary" onClick={() => router.push(eventPath(item))}>Details</button>
            </div>
          </div>
        </div>;
      })}
      <div ref={loadMoreRef} className="appify-load-more">{loadingMore && "Loading more events..."}</div>
    </div>
  </SocialShell>;
}
