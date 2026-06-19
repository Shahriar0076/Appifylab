"use client";

import { FormEvent, useEffect, useState } from "react";
import { SocialShell } from "@/components/layout/social-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";

type Preferences = {
  email: boolean;
  push: boolean;
  friends: boolean;
  reactions: boolean;
  comments: boolean;
  shares: boolean;
  messages: boolean;
  groups: boolean;
  events: boolean;
};

const defaults: Preferences = {
  email: true, push: true, friends: true, reactions: true, comments: true,
  shares: true, messages: true, groups: true, events: true,
};

const notifyLabels: Record<keyof Preferences, { label: string; desc: string }> = {
  email: { label: "Email notifications", desc: "Receive updates via email" },
  push: { label: "Push notifications", desc: "Receive push notifications in browser" },
  friends: { label: "Friend requests", desc: "When someone sends you a friend request" },
  reactions: { label: "Reactions", desc: "When someone reacts to your content" },
  comments: { label: "Comments", desc: "When someone comments on your posts" },
  shares: { label: "Shares", desc: "When someone shares your content" },
  messages: { label: "Messages", desc: "When you receive a new message" },
  groups: { label: "Groups", desc: "Group invites and activity" },
  events: { label: "Events", desc: "Event invitations and reminders" },
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={`appify-toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="appify-toggle-knob" />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [privacy, setPrivacy] = useState("public");
  const [preferences, setPreferences] = useState(defaults);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<{ profile: { privacy: string; notificationPreferences?: Partial<Preferences> } }>(`/profiles/${user.id}`)
      .then(({ profile }) => {
        setPrivacy(profile.privacy);
        setPreferences({ ...defaults, ...profile.notificationPreferences });
      });
  }, [user]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const body = new FormData();
    body.append("privacy", privacy);
    body.append("notificationPreferences", JSON.stringify(preferences));
    await api("/profiles/me", { method: "PATCH", body });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return <SocialShell>
    <div className="appify-settings">
      <div className="appify-settings-header">
        <div className="appify-settings-header-icon">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a2 2 0 00.4 2.2l.1.1-2.8 2.8-.1-.1a2 2 0 00-2.2-.4 2 2 0 00-1.2 1.8V22H10v-.2A2 2 0 008.8 20a2 2 0 00-2.2.4l-.1.1-2.8-2.8.1-.1A2 2 0 004.2 15a2 2 0 00-1.8-1.2H2V10h.2A2 2 0 004 8.8a2 2 0 00-.4-2.2l-.1-.1 2.8-2.8.1.1A2 2 0 008.8 4 2 2 0 0010 2.2V2h4v.2A2 2 0 0015.2 4a2 2 0 002.2-.4l.1-.1 2.8 2.8-.1.1a2 2 0 00-.4 2.2 2 2 0 001.8 1.2h.2v4h-.2A2 2 0 0019.4 15z" /></svg>
        </div>
        <div>
          <h2>Settings</h2>
          <p>Manage your privacy and notification preferences</p>
        </div>
      </div>

      <form onSubmit={save}>
        <section className="appify-settings-section">
          <div className="appify-settings-section-header">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            <div>
              <h3>Privacy</h3>
              <p>Control who can see your profile</p>
            </div>
          </div>
          <div className="appify-settings-field">
            <label className="appify-settings-label">Profile visibility</label>
            <select className="appify-settings-select" value={privacy} onChange={(event) => { setSaved(false); setPrivacy(event.target.value); }}>
              <option value="public">Public — anyone can see your profile</option>
              <option value="friends">Friends only — only friends can see your profile</option>
              <option value="private">Private — only you can see your profile</option>
            </select>
          </div>
        </section>

        <section className="appify-settings-section">
          <div className="appify-settings-section-header">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
            <div>
              <h3>Notifications</h3>
              <p>Choose which notifications you receive</p>
            </div>
          </div>
          <div className="appify-settings-notifies">
            {(Object.keys(preferences) as Array<keyof Preferences>).map((key) => (
              <div className="appify-settings-notify-row" key={key}>
                <div className="appify-settings-notify-text">
                  <strong>{notifyLabels[key].label}</strong>
                  <span>{notifyLabels[key].desc}</span>
                </div>
                <Toggle checked={preferences[key]} onChange={(v) => { setSaved(false); setPreferences((cur) => ({ ...cur, [key]: v })); }} />
              </div>
            ))}
          </div>
        </section>

        <div className="appify-settings-footer">
          <button className="appify-settings-save-btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && <span className="appify-settings-saved-msg">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
            Settings saved
          </span>}
        </div>
      </form>
    </div>
  </SocialShell>;
}
