"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/components/auth/auth-provider";
import { SocialShell } from "@/components/layout/social-shell";
import { Stories } from "@/components/feed/stories";
import { Composer } from "@/components/feed/composer";
import { PostCard } from "@/components/feed/post-card";
import { api, realtimeUrl } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await api<{ items: Post[]; nextCursor: number | null }>("/posts?limit=20");
      setPosts(data.items);
      setNextCursor(data.nextCursor);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load feed.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => { if (user) void loadPosts(); }, [user, loadPosts]);

  useEffect(() => {
    if (!user) return;
    const socket = io(realtimeUrl, { withCredentials: true });
    socket.on("feed:changed", () => void loadPosts());
    return () => { socket.disconnect(); };
  }, [user, loadPosts]);

  async function loadMore() {
    if (!nextCursor) return;
    const data = await api<{ items: Post[]; nextCursor: number | null }>(`/posts?limit=20&cursor=${nextCursor}`);
    setPosts((current) => [...current, ...data.items]);
    setNextCursor(data.nextCursor);
  }

  return (
    <SocialShell>
      <Stories /><Composer onCreated={loadPosts} />
      {error && <div className="appify-empty"><p className="appify-error">{error}</p><button className="appify-comment-submit" onClick={loadPosts}>Try again</button></div>}
      {feedLoading ? <div className="appify-feed-loading">Loading feed...</div> : posts.length ? posts.map((post) => <PostCard key={post.id} post={post} onChanged={loadPosts} />) : <div className="appify-empty">No posts yet. Create the first one above.</div>}
      {nextCursor && <div className="appify-load-more"><button className="appify-comment-submit" onClick={loadMore}>Load more posts</button></div>}
    </SocialShell>
  );
}
