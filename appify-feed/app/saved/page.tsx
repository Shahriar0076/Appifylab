"use client";

import { useCallback, useEffect, useState } from "react";
import { SocialShell } from "@/components/layout/social-shell";
import { PostCard } from "@/components/feed/post-card";
import { api } from "@/lib/api";
import type { Post } from "@/lib/types";

export default function SavedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const load = useCallback(async () => setPosts(await api<Post[]>("/posts/saved")), []);
  useEffect(() => { void load(); }, [load]);
  return <SocialShell><section className="appify-page-card"><h2>Saved Posts</h2></section>{posts.map((post) => <PostCard key={post.id} post={post} onChanged={load} />)}{!posts.length && <div className="appify-empty">No saved posts yet.</div>}</SocialShell>;
}
