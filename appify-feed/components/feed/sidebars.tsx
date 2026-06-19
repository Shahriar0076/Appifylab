"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api, mediaUrl, realtimeUrl } from "@/lib/api";
import { useNetworkRealtime } from "@/lib/use-network-realtime";
import { eventPath, profilePath } from "@/lib/routes";

type Person = { id: number; username: string; name: string; avatarUrl: string | null; workplace?: string; isFollowing: boolean; friendStatus: "connect" | "requested" };
type EventItem = { id: number; slug: string; title: string; imageUrl: string | null; startsAt: string; attendeeCount: number; attendance: string | null };

function ExploreIcon({ type }: { type: number }) {
  const paths = [
    <><circle cx="10" cy="10" r="9" /><path d="M8 6l6 4-6 4z" /></>,
    <><path d="M3 20V9M9 20V4M15 20v-7" /></>,
    <><circle cx="9" cy="7" r="4" /><path d="M2 21a7 7 0 0114 0M18 8v6M15 11h6" /></>,
    <><path d="M5 3h14v18l-7-4-7 4z" /></>,
    <><circle cx="9" cy="7" r="4" /><path d="M1 21a8 8 0 0116 0M17 4a4 4 0 010 7M23 21a7 7 0 00-5-7" /></>,
    <><path d="M7 8h10a5 5 0 015 5v4a4 4 0 01-7 3H9a4 4 0 01-7-3v-4a5 5 0 015-5zM8 13v4M6 15h4M17 14h.01M19 16h.01" /></>,
    <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a2 2 0 00.4 2.2l.1.1-2.8 2.8-.1-.1a2 2 0 00-2.2-.4 2 2 0 00-1.2 1.8V22H10v-.2A2 2 0 008.8 20a2 2 0 00-2.2.4l-.1.1-2.8-2.8.1-.1A2 2 0 004.2 15a2 2 0 00-1.8-1.2H2V10h.2A2 2 0 004 8.8a2 2 0 00-.4-2.2l-.1-.1 2.8-2.8.1.1A2 2 0 008.8 4 2 2 0 0010 2.2V2h4v.2A2 2 0 0015.2 4a2 2 0 002.2-.4l.1-.1 2.8 2.8-.1.1a2 2 0 00-.4 2.2 2 2 0 001.8 1.2h.2v4h-.2A2 2 0 0019.4 15z" /></>,
    <><path d="M5 3h14l2 2v16H3V3zM7 3v6h10V3M7 21v-8h10v8" /></>,
  ];
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>;
}

export function LeftSidebar() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => {
    Promise.all([api<{ people: Person[] }>("/network/people?limit=3"), api<{ events: EventItem[] }>("/events")])
      .then(([peopleData, eventData]) => { setPeople(peopleData.people); setEvents(eventData.events.slice(0, 2)); })
      .catch(() => undefined);
  }, []);
  useNetworkRealtime(() => {
    api<{ people: Person[] }>("/network/people?limit=3").then((data) => setPeople(data.people)).catch(() => undefined);
  });
  const explore = ["Learning", "Insights", "Find friends", "Bookmarks", "Group", "Gaming", "Settings", "Save post"];
  const routes = ["/learning", "/insights", "/friends", "/saved", "/groups", "/gaming", "/settings", "/saved"];
  return (
    <div className="_layout_left_sidebar_wrap">
      <div className="_layout_left_sidebar_inner">
        <div className="_left_inner_area_explore _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
          <h4 className="_left_inner_area_explore_title _title5 _mar_b24">Explore</h4>
          <ul className="_left_inner_area_explore_list">
            {explore.map((item, index) => (
              <li className={`_left_inner_area_explore_item ${index === 0 || index === 5 ? "_explore_item" : ""}`} key={item}>
                <button className="_left_inner_area_explore_link" onClick={() => router.push(routes[index])}><ExploreIcon type={index} />{item}</button>
                {(index === 0 || index === 5) && <span className="_left_inner_area_explore_link_txt">New</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="_layout_left_sidebar_inner">
        <div className="_left_inner_area_suggest _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
          <div className="_left_inner_area_suggest_content _mar_b24">
            <h4 className="_left_inner_area_suggest_content_title _title5">Suggested People</h4>
            <span className="_left_inner_area_suggest_content_txt"><button className="_left_inner_area_suggest_content_txt_link" onClick={() => router.push("/friends")}>See All</button></span>
          </div>
          {people.map((person) => (
            <div className="_left_inner_area_suggest_info" key={person.name}>
              <div className="_left_inner_area_suggest_info_box">
                <div className="_left_inner_area_suggest_info_image"><img src={mediaUrl(person.avatarUrl)} alt="" className="_info_img1" /></div>
                <div className="_left_inner_area_suggest_info_txt"><h4 className="_left_inner_area_suggest_info_title"><button className="appify-link-button" onClick={() => router.push(profilePath(person))}>{person.name}</button></h4><p className="_left_inner_area_suggest_info_para">{person.workplace || "Suggested for you"}</p></div>
              </div>
              <div className="_left_inner_area_suggest_info_link appify-suggestion-actions"><button className="_info_link appify-tooltip" data-tooltip={person.isFollowing ? "Unfollow" : "Follow"} onClick={async () => { const data = await api<{ isFollowing: boolean }>(`/network/people/${person.id}/follow`, { method: "POST" }); setPeople((items) => items.map((item) => item.id === person.id ? { ...item, isFollowing: data.isFollowing } : item)); }}>{person.isFollowing ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#377dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>}</button><button className="_info_link appify-tooltip" disabled={person.friendStatus === "requested"} data-tooltip={person.friendStatus === "requested" ? "Requested" : "Connect"} onClick={async () => { const data = await api<{ friendStatus: Person["friendStatus"] | "friend" }>(`/network/people/${person.id}/request`, { method: "POST" }); setPeople((items) => data.friendStatus === "friend" ? items.filter((item) => item.id !== person.id) : items.map((item) => item.id === person.id ? { ...item, friendStatus: data.friendStatus as Person["friendStatus"] } : item)); }}>{person.friendStatus === "requested" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#377dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>}</button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="_layout_left_sidebar_inner">
        <div className="_left_inner_area_event _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
          <div className="_left_inner_event_content"><h4 className="_left_inner_event_title _title5">Events</h4><button className="_left_inner_event_link" onClick={() => router.push("/events")}>See all</button></div>
          {events.map((event) => <div className="_left_inner_event_card" key={event.id}>
            <div className="_left_inner_event_card_iamge">{event.imageUrl ? <img src={mediaUrl(event.imageUrl)} alt="" className="_card_img" /> : <div className="_event_placeholder"><svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></svg></div>}</div>
            <div className="_left_inner_event_card_content"><div className="_left_inner_card_date"><p className="_left_inner_card_date_para">{new Date(event.startsAt).getDate()}</p><p className="_left_inner_card_date_para1">{new Date(event.startsAt).toLocaleString("en", { month: "short" })}</p></div><div className="_left_inner_card_txt"><h4 className="_left_inner_event_card_title"><button className="appify-link-button" onClick={() => router.push(eventPath(event))}>{event.title}</button></h4></div></div>
            <hr className="_underline" />
            <div className="_left_inner_event_bottom"><p className="_left_iner_event_bottom">{event.attendeeCount} People Going</p><button className="_left_iner_event_bottom_link" onClick={() => router.push(eventPath(event))}>{event.attendance === "going" ? "Going" : "View"}</button></div>
          </div>)}
        </div>
      </div>
    </div>
  );
}

export function RightSidebar() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [online, setOnline] = useState<Set<number>>(new Set());
  useEffect(() => {
    Promise.all([api<{ people: Person[] }>("/network/people?limit=1"), api<{ friends: Person[] }>("/network/friends")])
      .then(([peopleData, friendData]) => { setPeople(peopleData.people); setFriends(friendData.friends); })
      .catch(() => undefined);
    const socket = io(realtimeUrl, { withCredentials: true });
    socket.on("presence:snapshot", ({ userIds }) => setOnline(new Set(userIds)));
    socket.on("presence:update", ({ userId, online: isOnline }) => setOnline((current) => {
      const next = new Set(current);
      if (isOnline) next.add(userId); else next.delete(userId);
      return next;
    }));
    return () => { socket.disconnect(); };
  }, []);
  useNetworkRealtime(() => {
    Promise.all([api<{ people: Person[] }>("/network/people?limit=1"), api<{ friends: Person[] }>("/network/friends")])
      .then(([peopleData, friendData]) => { setPeople(peopleData.people); setFriends(friendData.friends); })
      .catch(() => undefined);
  });
  const suggestion = people[0];
  return (
    <div className="_layout_right_sidebar_wrap">
      <div className="_layout_right_sidebar_inner">
        <div className="_right_inner_area_info _padd_t24 _padd_b24 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
          <div className="_right_inner_area_info_content _mar_b24"><h4 className="_right_inner_area_info_content_title _title5">You Might Like</h4><span className="_right_inner_area_info_content_txt"><button className="_right_inner_area_info_content_txt_link appify-link-button" onClick={() => router.push("/friends")}>See All</button></span></div>
          <hr className="_underline" />
          <div className="_right_inner_area_info_ppl">
            {suggestion && <><div className="_right_inner_area_info_box"><div className="_right_inner_area_info_box_image"><img src={mediaUrl(suggestion.avatarUrl)} alt="" className="_ppl_img" /></div><div className="_right_inner_area_info_box_txt"><h4 className="_right_inner_area_info_box_title"><button className="appify-link-button" onClick={() => router.push(profilePath(suggestion))}>{suggestion.name}</button></h4><p className="_right_inner_area_info_box_para">{suggestion.workplace || "Suggested for you"}</p></div></div>
            <div className="_right_info_btn_grp"><button type="button" className="_right_info_btn_link" onClick={async () => { await api(`/network/people/${suggestion.id}/ignore`, { method: "POST" }); setPeople([]); }}>Ignore</button><button type="button" className="_right_info_btn_link" onClick={async () => { const data = await api<{ isFollowing: boolean }>(`/network/people/${suggestion.id}/follow`, { method: "POST" }); setPeople((items) => items.map((item) => ({ ...item, isFollowing: data.isFollowing }))); }}>{suggestion.isFollowing ? "Unfollow" : "Follow"}</button><button type="button" className="_right_info_btn_link _right_info_btn_link_active" disabled={suggestion.friendStatus === "requested"} onClick={async () => { const data = await api<{ friendStatus: Person["friendStatus"] | "friend" }>(`/network/people/${suggestion.id}/request`, { method: "POST" }); setPeople((items) => data.friendStatus === "friend" ? [] : items.map((item) => ({ ...item, friendStatus: data.friendStatus as Person["friendStatus"] }))); }}>{suggestion.friendStatus === "requested" ? "Requested" : "Connect"}</button></div></>}
          </div>
        </div>
      </div>
      <div className="_layout_right_sidebar_inner">
        <div className="_feed_right_inner_area_card _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
          <div className="_feed_top_fixed">
            <div className="_feed_right_inner_area_card_content _mar_b24"><h4 className="_feed_right_inner_area_card_content_title _title5">Your Friends</h4><span className="_feed_right_inner_area_card_content_txt"><button className="_feed_right_inner_area_card_content_txt_link" onClick={() => router.push("/friends")}>See All</button></span></div>
            <form className="_feed_right_inner_area_card_form" onSubmit={(event) => event.preventDefault()}>
              <svg className="_feed_right_inner_area_card_form_svg" width="17" height="17" fill="none" viewBox="0 0 17 17"><circle cx="7" cy="7" r="6" stroke="#666" /><path stroke="#666" strokeLinecap="round" d="M16 16l-3-3" /></svg>
              <input className="form-control me-2 _feed_right_inner_area_card_form_inpt" type="search" placeholder="Search friends" />
            </form>
          </div>
          <div className="_feed_bottom_fixed">
            {friends.map((person) => <div className={`_feed_right_inner_area_card_ppl ${online.has(person.id) ? "" : "_feed_right_inner_area_card_ppl_inactive"}`} key={person.id}>
              <div className="_feed_right_inner_area_card_ppl_box"><div className="_feed_right_inner_area_card_ppl_image"><img src={mediaUrl(person.avatarUrl)} alt="" className="_box_ppl_img" /></div><div className="_feed_right_inner_area_card_ppl_txt"><h4 className="_feed_right_inner_area_card_ppl_title"><button className="appify-link-button" onClick={() => router.push(profilePath(person))}>{person.name}</button></h4><p className="_feed_right_inner_area_card_ppl_para">{person.workplace || "Friend"}</p></div></div>
              <div className="_feed_right_inner_area_card_ppl_side">{online.has(person.id) ? <svg width="14" height="14" fill="none" viewBox="0 0 14 14"><rect width="12" height="12" x="1" y="1" fill="#0ACF83" stroke="#fff" strokeWidth="2" rx="6" /></svg> : <span>Offline</span>}</div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
