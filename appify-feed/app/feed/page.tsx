"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@/components/auth/auth-provider";
import { SocialShell } from "@/components/layout/social-shell";
import { Stories } from "@/components/feed/stories";
import { Composer } from "@/components/feed/composer";
import { PostCard } from "@/components/feed/post-card";
import { api, realtimeUrl } from "@/lib/api";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";
import type { Post } from "@/lib/types";

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await api<{ items: Post[]; nextCursor: number | null }>("/posts?limit=3");
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

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api<{ items: Post[]; nextCursor: number | null }>(`/posts?limit=3&cursor=${nextCursor}`);
      setPosts((current) => [...current, ...data.items]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor]);

  const loadMoreRef = useInfiniteScroll(loadMore, Boolean(nextCursor) && !feedLoading);

  return (
    <SocialShell>
      <Stories /><Composer onCreated={loadPosts} />
      {error && <div className="appify-empty"><p className="appify-error">{error}</p><button className="appify-comment-submit" onClick={loadPosts}>Try again</button></div>}
      {feedLoading ? <div className="appify-feed-loading">Loading feed...</div> : posts.length ? posts.map((post) => <PostCard key={post.id} post={post} onChanged={loadPosts} />) : <div className="appify-empty">No posts yet. Create the first one above.</div>}
      <div ref={loadMoreRef} className="appify-load-more">{loadingMore && "Loading more posts..."}</div>
    </SocialShell>
  );
}
