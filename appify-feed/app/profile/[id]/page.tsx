"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SocialShell } from "@/components/layout/social-shell";
import { PostCard } from "@/components/feed/post-card";
import { useAuth } from "@/components/auth/auth-provider";
import { api, mediaUrl } from "@/lib/api";
import { useNetworkRealtime } from "@/lib/use-network-realtime";
import { profilePath } from "@/lib/routes";
import type { Post } from "@/lib/types";

type Profile = { id: number; username: string; name: string; firstName: string; lastName: string; avatarUrl: string | null; coverUrl: string | null; bio: string; location: string; workplace: string; privacy: string; isPrivate?: boolean; isOwner: boolean; isFollowing: boolean; friendStatus?: "connect" | "requested" | "friend"; counts: { followers: number; following: number; friends: number } };

export default function ProfilePage() {
  const identifier = String(useParams().id);
  const router = useRouter();
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState(false);
  const avatar = useRef<HTMLInputElement>(null);
  const cover = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", bio: "", location: "", workplace: "", privacy: "public" });
  const load = useCallback(async () => { const encoded = encodeURIComponent(identifier); const [p, postData] = await Promise.all([api<{ profile: Profile }>(`/profiles/${encoded}`), api<Post[]>(`/profiles/${encoded}/posts`)]); setProfile(p.profile); setPosts(postData); setForm({ firstName: p.profile.firstName, lastName: p.profile.lastName, bio: p.profile.bio || "", location: p.profile.location || "", workplace: p.profile.workplace || "", privacy: p.profile.privacy }); const canonical = profilePath(p.profile); if (canonical !== `/profile/${identifier}`) router.replace(canonical); }, [identifier, router]);
  useEffect(() => { void load(); }, [load]);
  useNetworkRealtime(() => { void load(); });
  async function save(event: FormEvent) { event.preventDefault(); const body = new FormData(); Object.entries(form).forEach(([key, value]) => body.append(key, value)); if (avatar.current?.files?.[0]) body.append("avatar", avatar.current.files[0]); if (cover.current?.files?.[0]) body.append("cover", cover.current.files[0]); await api("/profiles/me", { method: "PATCH", body }); setEditing(false); await refresh(); void load(); }
  if (!profile) return <SocialShell><div className="appify-feed-loading">Loading profile...</div></SocialShell>;

  return <SocialShell>
    <div className="appify-profile-card">
      <div className="appify-profile-cover">
        {profile.coverUrl && <img src={mediaUrl(profile.coverUrl)} alt="" />}
      </div>
      <div className="appify-profile-body">
        <img className="appify-profile-avatar" src={mediaUrl(profile.avatarUrl)} alt="" />
        <h2 className="appify-profile-name">{profile.name}</h2>
        <p className="appify-profile-username">@{profile.username}</p>
        {profile.bio && <p className="appify-profile-bio">{profile.bio}</p>}
        {(profile.workplace || profile.location) && <p className="appify-profile-info">{[profile.workplace, profile.location].filter(Boolean).join(" · ")}</p>}
        <div className="appify-profile-stats">
          <div className="appify-profile-stat"><span className="appify-profile-stat-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></span><strong>{profile.counts.followers}</strong><span className="appify-profile-stat-label">Followers</span></div>
          <div className="appify-profile-stat-divider" />
          <div className="appify-profile-stat"><span className="appify-profile-stat-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></span><strong>{profile.counts.following}</strong><span className="appify-profile-stat-label">Following</span></div>
          <div className="appify-profile-stat-divider" />
          <div className="appify-profile-stat"><span className="appify-profile-stat-icon"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></span><strong>{profile.counts.friends}</strong><span className="appify-profile-stat-label">Friends</span></div>
        </div>
        {profile.isOwner ? (
          <button className="appify-profile-btn" onClick={() => setEditing((v) => !v)}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> Edit profile</button>
        ) : (
          <div className="appify-profile-actions">
            {profile.friendStatus === "friend" ? (
              <><span className="appify-profile-badge-friend"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg> Friends</span>
              <button className="appify-profile-btn appify-profile-btn--danger" onClick={async () => { await api(`/network/people/${profile.id}/friend`, { method: "DELETE" }); void load(); }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg> Remove</button></>
            ) : (
              <button className={`appify-profile-btn ${profile.friendStatus === "requested" ? "appify-profile-btn--outline" : ""}`} disabled={profile.friendStatus === "requested"} onClick={async () => { await api(`/network/people/${profile.id}/request`, { method: "POST" }); void load(); }}>
                {profile.friendStatus === "requested" ? <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Requested</> : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg> Connect</>}
              </button>
            )}
            <button className={`appify-profile-btn ${profile.isFollowing ? "appify-profile-btn--outline" : ""}`} onClick={async () => { await api(`/network/people/${profile.id}/follow`, { method: "POST" }); void load(); }}>
              {profile.isFollowing ? <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg> Unfollow</> : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> Follow</>}
            </button>
            <button className="appify-profile-btn appify-profile-btn--outline" onClick={async () => { const data = await api<{ id: number }>("/messages", { method: "POST", body: JSON.stringify({ userId: profile.id }) }); location.href = `/messages?conversation=${data.id}`; }}><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> Message</button>
          </div>
        )}
      </div>
    </div>

    {profile.isPrivate && <div className="appify-empty">This profile is private.</div>}
    {editing && <form className="appify-page-card appify-settings-form" onSubmit={save}>
      <div className="appify-auth-name-row">
        <div className="appify-form-group"><label className="appify-form-label">First name</label><input className="form-control _social_login_input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
        <div className="appify-form-group"><label className="appify-form-label">Last name</label><input className="form-control _social_login_input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
      </div>
      <div className="appify-form-group"><label className="appify-form-label">Bio</label><textarea className="form-control _social_login_input appify-settings-textarea" placeholder="Tell us about yourself" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
      <div className="appify-auth-name-row">
        <div className="appify-form-group"><label className="appify-form-label">Workplace</label><input className="form-control _social_login_input" placeholder="Workplace" value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })} /></div>
        <div className="appify-form-group"><label className="appify-form-label">Location</label><input className="form-control _social_login_input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
      </div>
      <div className="appify-auth-name-row">
        <div className="appify-form-group"><label className="appify-form-label">Profile picture</label><label className="appify-file-label"><input ref={avatar} className="appify-file-input" type="file" accept="image/*" onChange={(e) => { const name = e.target.files?.[0]?.name; const label = e.currentTarget.nextElementSibling; if (name && label) label.textContent = name; }} /><span className="appify-file-btn">Choose File</span><span className="appify-file-name">No file chosen</span></label></div>
        <div className="appify-form-group"><label className="appify-form-label">Cover picture</label><label className="appify-file-label"><input ref={cover} className="appify-file-input" type="file" accept="image/*" onChange={(e) => { const name = e.target.files?.[0]?.name; const label = e.currentTarget.nextElementSibling; if (name && label) label.textContent = name; }} /><span className="appify-file-btn">Choose File</span><span className="appify-file-name">No file chosen</span></label></div>
      </div>
      <div className="appify-form-group"><label className="appify-form-label">Visibility</label><div className="appify-toggle-row"><button type="button" className={`appify-toggle ${form.privacy === "public" ? "appify-toggle--on" : ""}`} onClick={() => setForm({ ...form, privacy: form.privacy === "public" ? "private" : "public" })}><span className="appify-toggle-thumb" /></button><span className="appify-toggle-label">{form.privacy === "public" ? "Public" : "Private"}</span></div></div>
      <button className="appify-settings-save-btn" type="submit">Save profile</button>
    </form>}
    {posts.map((post) => <PostCard key={post.id} post={post} onChanged={load} />)}
  </SocialShell>;
}
