"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SocialShell } from "@/components/layout/social-shell";
import { ResourceCard } from "@/components/features/resource-card";
import { api } from "@/lib/api";
import { eventPath, groupPath, profilePath } from "@/lib/routes";

type Result = {
  users: Array<{ id: number; username: string; name: string; avatarUrl: string | null; workplace?: string }>;
  posts: Array<{ id: number; content: string; author: { id: number; username: string; name: string } }>;
  groups: Array<{ id: number; slug: string; name: string; description: string; imageUrl: string | null }>;
  events: Array<{ id: number; slug: string; title: string; startsAt: string; imageUrl: string | null }>;
  nextCursor: string | null;
};

const empty: Result = { users: [], posts: [], groups: [], events: [], nextCursor: null };

export default function SearchPage() {
  return (
    <Suspense fallback={<SocialShell><div className="appify-feed-loading">Loading search...</div></SocialShell>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [query, setQuery] = useState(q);
  const [result, setResult] = useState<Result>(empty);

  useEffect(() => {
    setQuery(q);
    if (q) {
      api<Result>(`/search?q=${encodeURIComponent(q)}`).then(setResult);
    } else {
      setResult(empty);
    }
  }, [q]);

  async function loadMore() {
    if (!result.nextCursor) return;
    const next = await api<Result>(`/search?q=${encodeURIComponent(query)}&cursor=${encodeURIComponent(result.nextCursor)}`);
    setResult((current) => ({
      users: [...current.users, ...next.users],
      posts: [...current.posts, ...next.posts],
      groups: [...current.groups, ...next.groups],
      events: [...current.events, ...next.events],
      nextCursor: next.nextCursor,
    }));
  }

  return <SocialShell><section className="appify-page-card"><h2>Search results</h2><p>Results for &quot;{query}&quot;</p></section>
    {result.users.map((item) => <ResourceCard key={`u-${item.id}`} title={item.name} subtitle={item.workplace || `@${item.username}`} imageUrl={item.avatarUrl} href={profilePath(item)}><button className="appify-comment-submit" onClick={() => router.push(profilePath(item))}>Profile</button></ResourceCard>)}
    {result.posts.map((item) => <ResourceCard key={`p-${item.id}`} title={item.author.name} subtitle={item.content} href={profilePath(item.author)} />)}
    {result.groups.map((item) => <ResourceCard key={`g-${item.id}`} title={item.name} subtitle={item.description} imageUrl={item.imageUrl} href={groupPath(item)}><button className="appify-comment-submit" onClick={() => router.push(groupPath(item))}>View group</button></ResourceCard>)}
    {result.events.map((item) => <ResourceCard key={`e-${item.id}`} title={item.title} subtitle={item.startsAt} imageUrl={item.imageUrl} href={eventPath(item)}><button className="appify-comment-submit" onClick={() => router.push(eventPath(item))}>View event</button></ResourceCard>)}
    {result.nextCursor && <div className="appify-load-more"><button className="appify-comment-submit" onClick={loadMore}>Load more results</button></div>}
  </SocialShell>;
}
