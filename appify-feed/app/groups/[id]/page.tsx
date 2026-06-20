"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { SocialShell } from "@/components/layout/social-shell";
import { Composer } from "@/components/feed/composer";
import { PostCard } from "@/components/feed/post-card";
import { api, mediaUrl, realtimeUrl } from "@/lib/api";
import { groupPath, profilePath } from "@/lib/routes";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { Post } from "@/lib/types";

type Group = { id: number; slug: string; name: string; description: string; imageUrl: string | null; membership: string | null; memberCount?: number; members: Array<{ id: number; username: string; name: string; avatarUrl: string | null; role: string }>; posts: Post[]; postsNextCursor: number | null };

function isFullPost(post: Partial<Post>): post is Post {
  return Boolean(
    post.reactions
    && Array.isArray(post.reactions.users)
    && Array.isArray(post.comments)
    && typeof post.commentCount === "number"
    && typeof post.shareCount === "number",
  );
}

export default function GroupPage() {
  const identifier = String(useParams().id);
  const router = useRouter();
  const groupIdRef = useRef<number | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const load = useCallback(async () => {
    const data = await api<{ group: Group }>(`/groups/${encodeURIComponent(identifier)}?postsLimit=3`);
    groupIdRef.current = data.group.id;
    setGroup({ ...data.group, posts: data.group.posts.filter(isFullPost) });
    const canonical = groupPath(data.group);
    if (canonical !== `/groups/${identifier}`) router.replace(canonical);
  }, [identifier, router]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const socket = io(realtimeUrl, { withCredentials: true });
    socket.on("group:changed", (ev: { type: string; groupId: number }) => {
      if (String(ev.groupId) === identifier || String(ev.groupId) === String(groupIdRef.current)) void load();
    });
    return () => { socket.disconnect(); };
  }, [load, identifier]);

  const loadMorePosts = useCallback(async () => {
    if (!group?.postsNextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<{ group: Group }>(`/groups/${encodeURIComponent(group.slug)}?postsLimit=3&postsCursor=${group.postsNextCursor}`);
      setGroup((current) => current ? {
        ...current,
        posts: [...current.posts, ...data.group.posts.filter(isFullPost)],
        postsNextCursor: data.group.postsNextCursor,
      } : current);
    } finally {
      setLoadingMore(false);
    }
  }, [group?.postsNextCursor, group?.slug, loadingMore]);

  const loadMoreRef = useInfiniteScroll(loadMorePosts, Boolean(group?.postsNextCursor));

  if (!group) return <SocialShell><div className="appify-feed-loading">Loading group...</div></SocialShell>;

  const isMember = !!group.membership;
  const isAdmin = group.membership === "admin";

  return <SocialShell>
    <div className="appify-group-cover-card">
      <div className="appify-group-cover">
        {group.imageUrl ? <img src={mediaUrl(group.imageUrl)} alt="" /> : <div className="appify-group-cover-placeholder"><svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#b0bec5" strokeWidth="1.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>}
      </div>
      <div className="appify-group-info">
        <div className="appify-group-info-text">
          <h2 className="appify-group-name">{group.name}</h2>
          {group.description && <p className="appify-group-desc">{group.description}</p>}
          <div className="appify-group-meta">
            <span className="appify-group-meta-item"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg> {group.members.length} member{group.members.length !== 1 ? "s" : ""}</span>
            {isMember && <span className="appify-group-meta-badge">{group.membership}</span>}
          </div>
        </div>
        <button className={`appify-group-join-btn ${isMember ? "appify-group-leave-btn" : ""}`} onClick={async () => { await api(`/groups/${group.slug}/membership`, { method: "POST" }); void load(); }}>{isMember ? "Leave group" : "Join group"}</button>
      </div>
    </div>

    {isMember && <Composer
      endpoint={`/groups/${encodeURIComponent(group.slug)}/posts`}
      placeholder={`Write something in ${group.name}...`}
      audienceLabel={group.name}
      onCreated={load}
    />}

    {group.posts.length === 0
      ? <div className="appify-empty">No posts in this group yet.</div>
      : group.posts.map((post) => <PostCard key={post.id} post={post} onChanged={load} />)}
    <div ref={loadMoreRef} className="appify-load-more">{loadingMore && "Loading more group posts..."}</div>

    <section className="appify-page-card appify-group-members-card">
      <h3 className="appify-group-section-title">Members</h3>
      <div className="appify-group-members-list">
        {group.members.map((member) => <div className="appify-group-member-row" key={member.id}>
          <div className="appify-group-member-info">
            <img className="appify-group-member-avatar" src={mediaUrl(member.avatarUrl)} alt="" />
            <div className="appify-group-member-text">
              <button className="appify-link-button appify-group-member-name" onClick={() => router.push(profilePath(member))}>{member.name}</button>
              <span className={`appify-group-member-role ${member.role === "admin" ? "appify-group-member-role-admin" : ""}`}>{member.role}</span>
            </div>
          </div>
          {isAdmin && member.role !== "admin" && <select className="appify-group-role-select" value={member.role} onChange={async (event) => { await api(`/groups/${group.slug}/members/${member.id}/role`, { method: "PATCH", body: JSON.stringify({ role: event.target.value }) }); void load(); }}><option value="member">Member</option><option value="moderator">Moderator</option></select>}
        </div>)}
      </div>
    </section>
  </SocialShell>;
}
