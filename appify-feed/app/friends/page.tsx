"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { SocialShell } from "@/components/layout/social-shell";
import { api, mediaUrl } from "@/lib/api";
import { useNetworkRealtime } from "@/lib/use-network-realtime";
import { profilePath } from "@/lib/routes";
import { useInfiniteScroll } from "@/lib/use-infinite-scroll";

type Person = { id: number; username: string; name: string; avatarUrl: string | null; coverUrl?: string | null; workplace?: string; isFollowing: boolean; friendStatus: "connect" | "requested" };
type Request = { id: number; user: Person };
type Paged<T> = { nextCursor: number | null } & T;

function PersonCard({
  person, actions,
}: {
  person: { id: number; username: string; name: string; avatarUrl: string | null; coverUrl?: string | null; workplace?: string };
  actions: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="appify-person-card">
      <div className="appify-person-card-cover">{person.coverUrl && <img src={mediaUrl(person.coverUrl)} alt="" />}</div>
      <div className="appify-person-card-avatar" onClick={() => router.push(profilePath(person))}>
        <img src={mediaUrl(person.avatarUrl)} alt="" />
      </div>
      <div className="appify-person-card-body">
        <button className="appify-person-card-name" onClick={() => router.push(profilePath(person))}>{person.name}</button>
        {person.workplace && <span className="appify-person-card-sub">{person.workplace}</span>}
      </div>
      <div className="appify-person-card-actions">{actions}</div>
    </div>
  );
}

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "friends" | "suggestions">("all");
  const [peopleNextCursor, setPeopleNextCursor] = useState<number | null>(null);
  const [friendsNextCursor, setFriendsNextCursor] = useState<number | null>(null);
  const [requestsNextCursor, setRequestsNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    if (loading || !user) return;
    try {
      const [peopleData, friendsData, requestData] = await Promise.all([
        api<Paged<{ people: Person[] }>>(`/network/people?limit=3&q=${encodeURIComponent(query)}`),
        api<Paged<{ friends: Person[] }>>(`/network/friends?limit=3&q=${encodeURIComponent(query)}`),
        api<Paged<{ requests: Request[] }>>("/network/requests?limit=3"),
      ]);
      setPeople(peopleData.people); setFriends(friendsData.friends); setRequests(requestData.requests);
      setPeopleNextCursor(peopleData.nextCursor); setFriendsNextCursor(friendsData.nextCursor); setRequestsNextCursor(requestData.nextCursor);
    } catch {
      setPeople([]); setFriends([]); setRequests([]);
      setPeopleNextCursor(null); setFriendsNextCursor(null); setRequestsNextCursor(null);
    }
  }, [loading, query, user]);
  useEffect(() => { void load(); }, [load]);
  useNetworkRealtime(() => { void load(); });

  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "requests" as const, label: `Friend Requests${requests.length ? ` (${requests.length})` : ""}` },
    { key: "friends" as const, label: `Friends${friends.length ? ` (${friends.length})` : ""}` },
    { key: "suggestions" as const, label: "Suggested" },
  ];

  const showRequests = activeTab === "all" || activeTab === "requests";
  const showFriends = activeTab === "all" || activeTab === "friends";
  const showSuggestions = activeTab === "all" || activeTab === "suggestions";
  const hasMoreVisible = Boolean((showRequests && requestsNextCursor) || (showFriends && friendsNextCursor) || (showSuggestions && peopleNextCursor));

  const loadMore = useCallback(async () => {
    if (loadingMore || !user || !hasMoreVisible) return;
    setLoadingMore(true);
    try {
      await Promise.all([
        showRequests && requestsNextCursor
          ? api<Paged<{ requests: Request[] }>>(`/network/requests?limit=3&cursor=${requestsNextCursor}`).then((data) => {
            setRequests((items) => [...items, ...data.requests]);
            setRequestsNextCursor(data.nextCursor);
          })
          : Promise.resolve(),
        showFriends && friendsNextCursor
          ? api<Paged<{ friends: Person[] }>>(`/network/friends?limit=3&q=${encodeURIComponent(query)}&cursor=${friendsNextCursor}`).then((data) => {
            setFriends((items) => [...items, ...data.friends]);
            setFriendsNextCursor(data.nextCursor);
          })
          : Promise.resolve(),
        showSuggestions && peopleNextCursor
          ? api<Paged<{ people: Person[] }>>(`/network/people?limit=3&q=${encodeURIComponent(query)}&cursor=${peopleNextCursor}`).then((data) => {
            setPeople((items) => [...items, ...data.people]);
            setPeopleNextCursor(data.nextCursor);
          })
          : Promise.resolve(),
      ]);
    } finally {
      setLoadingMore(false);
    }
  }, [friendsNextCursor, hasMoreVisible, loadingMore, peopleNextCursor, query, requestsNextCursor, showFriends, showRequests, showSuggestions, user]);

  const loadMoreRef = useInfiniteScroll(loadMore, hasMoreVisible);

  return <SocialShell>
    <div className="appify-page-card appify-friends-header">
      <h2>Friends</h2>
      <div className="appify-friends-search">
        <svg className="appify-friends-search-icon" width="17" height="17" fill="none" viewBox="0 0 17 17"><circle cx="7" cy="7" r="6" stroke="#999" strokeWidth="1.5" /><path stroke="#999" strokeWidth="1.5" strokeLinecap="round" d="M16 16l-3.5-3.5" /></svg>
        <input className="form-control appify-friends-search-input" placeholder="Search people and friends" value={query} onChange={(e) => setQuery(e.target.value)} />
        {query && <button type="button" className="appify-friends-search-clear" onClick={() => setQuery("")}>&times;</button>}
      </div>
      <div className="appify-friends-tabs">
        {tabs.map((tab) => <button key={tab.key} className={`appify-friends-tab ${activeTab === tab.key ? "appify-friends-tab-active" : ""}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>)}
      </div>
    </div>

    {showRequests && requests.length > 0 && <div className="appify-page-card">
      <h3 className="appify-friends-section-title">Friend Requests</h3>
      <div className="appify-friends-grid">
        {requests.map((item) => <PersonCard key={`r-${item.id}`} person={item.user} actions={<><button className="appify-btn appify-btn-primary" onClick={async () => { await api(`/network/requests/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "accepted" }) }); void load(); }}>Accept</button><button className="appify-btn appify-btn-outline" onClick={async () => { await api(`/network/requests/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }); void load(); }}>Ignore</button></>} />)}
      </div>
    </div>}

    {showFriends && <div className="appify-page-card">
      <h3 className="appify-friends-section-title">Your Friends</h3>
      {friends.length === 0 && <p className="appify-friends-empty">No friends found{query ? " matching your search" : ""}. Try connecting with suggested people below.</p>}
      {friends.length > 0 && <div className="appify-friends-grid">
        {friends.map((person) => <PersonCard key={`f-${person.id}`} person={person} actions={<button className="appify-btn appify-btn-outline appify-btn-sm" onClick={async () => { const data = await api<{ id: number }>("/messages", { method: "POST", body: JSON.stringify({ userId: person.id }) }); location.href = `/messages?conversation=${data.id}`; }}>Message</button>} />)}
      </div>}
    </div>}

    {showSuggestions && <div className="appify-page-card">
      <h3 className="appify-friends-section-title">People You May Know</h3>
      {people.length === 0 && <p className="appify-friends-empty">No new suggestions{query ? " matching your search" : ""} right now.</p>}
      {people.length > 0 && <div className="appify-friends-grid">
        {people.map((person) => <PersonCard key={person.id} person={person} actions={<><button className={`appify-btn ${person.isFollowing ? "appify-btn-outline" : "appify-btn-secondary"}`} onClick={async () => { const data = await api<{ isFollowing: boolean }>(`/network/people/${person.id}/follow`, { method: "POST" }); setPeople((items) => items.map((item) => item.id === person.id ? { ...item, isFollowing: data.isFollowing } : item)); }}>{person.isFollowing ? "Unfollow" : "Follow"}</button><button className={person.friendStatus === "requested" ? "appify-btn appify-btn-outline" : "appify-btn appify-btn-primary"} disabled={person.friendStatus === "requested"} onClick={async () => { const data = await api<{ friendStatus: Person["friendStatus"] | "friend" }>(`/network/people/${person.id}/request`, { method: "POST" }); setPeople((items) => data.friendStatus === "friend" ? items.filter((item) => item.id !== person.id) : items.map((item) => item.id === person.id ? { ...item, friendStatus: data.friendStatus as Person["friendStatus"] } : item)); if (data.friendStatus === "friend") void load(); }}>{person.friendStatus === "requested" ? "Requested" : "Connect"}</button></>} />)}
      </div>}
    </div>}
    <div ref={loadMoreRef} className="appify-load-more">{loadingMore && "Loading more people..."}</div>
  </SocialShell>;
}
