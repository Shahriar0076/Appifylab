"use client";

import { FormEvent, useRef, useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SocialShell } from "@/components/layout/social-shell";
import { ResourceCard } from "@/components/features/resource-card";
import { api } from "@/lib/api";
import { groupPath } from "@/lib/routes";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";

type Group = { id: number; slug: string; name: string; description: string; imageUrl: string | null; memberCount: number; membership: string | null };

export default function GroupsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  async function load() {
    const data = await api<{ groups: Group[]; nextCursor: number | null }>("/groups?limit=3");
    setGroups(data.groups);
    setNextCursor(data.nextCursor);
  }
  useEffect(() => { void load(); }, []);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<{ groups: Group[]; nextCursor: number | null }>(`/groups?limit=3&cursor=${nextCursor}`);
      setGroups((items) => [...items, ...data.groups]);
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
    if (fileRef.current) fileRef.current.value = "";
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const body = new FormData();
    body.append("name", name);
    body.append("description", description);
    body.append("privacy", "public");
    if (imageFile) body.append("image", imageFile);
    await api("/groups", { method: "POST", body });
    setName("");
    setDescription("");
    removeImage();
    void load();
  }

  return <SocialShell>
    <section className="appify-page-card">
      <h2 className="appify-groups-title">Groups</h2>
      <form className="appify-groups-form" onSubmit={create}>
        <div className="appify-groups-form-group">
          <label className="appify-groups-label">Group name</label>
          <input className="appify-groups-input" placeholder="Enter a group name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="appify-groups-form-group">
          <label className="appify-groups-label">Description</label>
          <textarea className="appify-groups-textarea" placeholder="What is this group about?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="appify-groups-form-group">
          <label className="appify-groups-label">Group picture</label>
          <div className="appify-groups-image-picker" onClick={() => fileRef.current?.click()}>
            {imagePreview ? <img src={imagePreview} alt="" className="appify-groups-image-preview" /> : (
              <div className="appify-groups-image-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span>Add a cover photo</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="appify-file-input" onChange={handleImageChange} />
          {imagePreview && <button type="button" className="appify-groups-image-remove" onClick={removeImage}>Remove</button>}
        </div>
        <button className="appify-groups-submit" type="submit" disabled={!name.trim()}>Create group</button>
      </form>
    </section>
    {groups.length > 0 && <section className="appify-page-card">
      <h3 className="appify-groups-list-title">Your Groups</h3>
      <div className="appify-groups-list">
        {groups.map((group) => <ResourceCard key={group.id} title={group.name} subtitle={`${group.description || "Community group"} · ${group.memberCount} members`} imageUrl={group.imageUrl} href={groupPath(group)}><button className="appify-secondary-button" onClick={() => router.push(groupPath(group))}>View</button><button className="appify-comment-submit" onClick={async () => { await api(`/groups/${group.slug}/membership`, { method: "POST" }); void load(); }}>{group.membership ? "Leave" : "Join"}</button></ResourceCard>)}
      </div>
      <div ref={loadMoreRef} className="appify-load-more">{loadingMore && "Loading more groups..."}</div>
    </section>}
  </SocialShell>;
}
