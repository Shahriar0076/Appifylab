"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { io } from "socket.io-client";
import { useAuth } from "@/components/auth/auth-provider";
import { api, mediaUrl, realtimeAuthOptions, realtimeUrl } from "@/lib/api";
import { profilePath } from "@/lib/routes";

type Notification = { id: number; message: string; type: string; isRead: boolean; createdAt: string; actor: { id: number; username: string; name: string; avatarUrl: string | null } | null };

function SearchIcon({ className = "" }: { className?: string }) {
  return <svg className={className} width="17" height="17" fill="none" viewBox="0 0 17 17"><circle cx="7" cy="7" r="6" stroke="#666" /><path stroke="#666" strokeLinecap="round" d="M16 16l-3-3" /></svg>;
}

const navIcons = [
  <svg key="home" width="18" height="21" fill="none" viewBox="0 0 18 21"><path className="_home_active" stroke="#000" strokeWidth="1.5" strokeOpacity=".6" d="M1 9.9c0-1.5 0-2.3.3-3 .3-.7.9-1.2 2.1-2.2l1.1-1C6.7 1.9 7.7 1 9 1s2.3.9 4.5 2.7l1.1 1c1.2 1 1.8 1.5 2.1 2.2.3.7.3 1.5.3 3v4.9c0 2.1 0 3.2-.7 3.9-.7.7-1.7.7-3.9.7H5.6c-2.2 0-3.2 0-3.9-.7-.7-.7-.7-1.7-.7-3.9V9.9z" /><path className="_home_active" stroke="#000" strokeOpacity=".6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.9 19.3v-5.8a1 1 0 00-1-1H7.1a1 1 0 00-1 1v5.8" /></svg>,
  <svg key="friends" width="26" height="20" fill="none" viewBox="0 0 26 20"><path fill="#000" fillOpacity=".6" d="M13 11a5.5 5.5 0 100-11 5.5 5.5 0 000 11zm0 1.5c-4.8 0-8 1.2-8 3.7S8.2 20 13 20s8-1.2 8-3.8-3.2-3.7-8-3.7zM3.7 11.8C1.3 12.2 0 13.2 0 14.7c0 1 .6 1.8 1.9 2.4a1 1 0 00.8-1.8c-.7-.3-.8-.5-.8-.7 0-.4.7-.8 2.1-1a1 1 0 00-.3-1.8zm18.6 0a1 1 0 00-.3 1.8c1.4.2 2.1.6 2.1 1 0 .2-.1.4-.8.7a1 1 0 00.8 1.8c1.3-.6 1.9-1.4 1.9-2.4 0-1.5-1.3-2.5-3.7-2.9z" /></svg>,
  <svg key="bell" width="20" height="22" fill="none" viewBox="0 0 20 22"><path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M10 0c4.6 0 7.7 3.5 7.7 6.9 0 1.7.4 2.4.9 3.2.5.8 1 1.6 1 3.2-.4 4.1-4.7 4.5-9.6 4.5S.4 17.4 0 13.3c0-1.7.5-2.5 1-3.3.5-.8.9-1.5.9-3.1C1.9 3.5 5 0 10 0zm0 19.5a4.1 4.1 0 003 1.4.8.8 0 001.1-1.1.8.8 0 00-1.1 0 4 4 0 01-6 0 .8.8 0 00-1.1 0 .8.8 0 000 1.1 4.1 4.1 0 003.1 1.4z" clipRule="evenodd" /></svg>,
  <svg key="chat" width="23" height="22" fill="none" viewBox="0 0 23 22"><path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M11.4 0a11 11 0 00-10 15.6c.2.5.3.9.3 1.2 0 .3-.2.8-.3 1.2-.3.9-.7 2 .1 2.8.9.8 2 .4 2.9.1.4-.1.9-.3 1.2-.3.3 0 .7.2 1.2.4a11 11 0 0012.5-2.2 11 11 0 000-15.6A11 11 0 0011.4 0zm-4.2 10.4a1 1 0 110 2 1 1 0 010-2zm4.2 0a1 1 0 110 2 1 1 0 010-2zm4.1 0a1 1 0 110 2 1 1 0 010-2z" clipRule="evenodd" /></svg>,
];

const mobileIcons = [
  <svg key="m-home" xmlns="http://www.w3.org/2000/svg" width="24" height="27" fill="none" viewBox="0 0 24 27"><path className="_mobile_svg" fill="#000" fillOpacity=".6" stroke="#666666" strokeWidth="1.5" d="M1 13.042c0-2.094 0-3.141.431-4.061.432-.92 1.242-1.602 2.862-2.965l1.571-1.321C8.792 2.232 10.256 1 12 1c1.744 0 3.208 1.232 6.136 3.695l1.572 1.321c1.62 1.363 2.43 2.044 2.86 2.965.432.92.432 1.967.432 4.06v6.54c0 2.908 0 4.362-.92 5.265-.921.904-2.403.904-5.366.904H7.286c-2.963 0-4.445 0-5.365-.904C1 23.944 1 22.49 1 19.581v-6.54z"/><path fill="#fff" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.07 18.497h5.857v7.253H9.07v-7.253z"/></svg>,
  <svg key="m-friends" xmlns="http://www.w3.org/2000/svg" width="27" height="20" fill="none" viewBox="0 0 27 20"><path className="_dark_svg" fill="#000" fillOpacity=".6" fillRule="evenodd" d="M13.334 12.405h.138l.31.001c2.364.015 7.768.247 7.768 3.81 0 3.538-5.215 3.769-7.732 3.784h-.932c-2.364-.015-7.77-.247-7.77-3.805 0-3.543 5.405-3.774 7.77-3.789l.31-.001h.138zm0 1.787c-2.91 0-6.38.348-6.38 2.003 0 1.619 3.263 1.997 6.114 2.018l.266.001c2.91 0 6.379-.346 6.379-1.998 0-1.673-3.469-2.024-6.38-2.024zm9.742-2.27c2.967.432 3.59 1.787 3.59 2.849 0 .648-.261 1.83-2.013 2.48a.953.953 0 01-.327.058.919.919 0 01-.858-.575.886.886 0 01.531-1.153c.83-.307.83-.647.83-.81 0-.522-.682-.886-2.027-1.082a.9.9 0 01-.772-1.017c.074-.488.54-.814 1.046-.75zm-18.439.75a.9.9 0 01-.773 1.017c-1.345.196-2.027.56-2.027 1.082 0 .163 0 .501.832.81a.886.886 0 01.531 1.153.92.92 0 01-.858.575.953.953 0 01-.327-.058C.262 16.6 0 15.418 0 14.77c0-1.06.623-2.417 3.592-2.85.506-.061.97.263 1.045.751zM13.334 0c3.086 0 5.596 2.442 5.596 5.442 0 3.001-2.51 5.443-5.596 5.443H13.3a5.616 5.616 0 01-3.943-1.603A5.308 5.308 0 017.74 5.439C7.739 2.442 10.249 0 13.334 0zm0 1.787c-2.072 0-3.758 1.64-3.758 3.655-.003.977.381 1.89 1.085 2.58a3.772 3.772 0 002.642 1.076l.03.894v-.894c2.073 0 3.76-1.639 3.76-3.656 0-2.015-1.687-3.655-3.76-3.655zm7.58-.62c2.153.344 3.717 2.136 3.717 4.26-.004 2.138-1.647 3.972-3.82 4.269a.911.911 0 01-1.036-.761.897.897 0 01.782-1.01c1.273-.173 2.235-1.248 2.237-2.501 0-1.242-.916-2.293-2.179-2.494a.897.897 0 01-.756-1.027.917.917 0 011.055-.736zM6.81 1.903a.897.897 0 01-.757 1.027C4.79 3.13 3.874 4.182 3.874 5.426c.002 1.251.963 2.327 2.236 2.5.503.067.853.519.783 1.008a.912.912 0 01-1.036.762c-2.175-.297-3.816-2.131-3.82-4.267 0-2.126 1.563-3.918 3.717-4.262.515-.079.972.251 1.055.736z" clipRule="evenodd"/></svg>,
  <svg key="m-bell" xmlns="http://www.w3.org/2000/svg" width="25" height="27" fill="none" viewBox="0 0 25 27"><path className="_dark_svg" fill="#000" fillOpacity=".6" fillRule="evenodd" d="M10.17 23.46c.671.709 1.534 1.098 2.43 1.098.9 0 1.767-.39 2.44-1.099.36-.377.976-.407 1.374-.067.4.34.432.923.073 1.3-1.049 1.101-2.428 1.708-3.886 1.708h-.003c-1.454-.001-2.831-.608-3.875-1.71a.885.885 0 01.072-1.298 1.01 1.01 0 011.374.068zM12.663 0c5.768 0 9.642 4.251 9.642 8.22 0 2.043.549 2.909 1.131 3.827.576.906 1.229 1.935 1.229 3.88-.453 4.97-5.935 5.375-12.002 5.375-6.067 0-11.55-.405-11.998-5.296-.004-2.024.649-3.053 1.225-3.959l.203-.324c.501-.814.928-1.7.928-3.502C3.022 4.25 6.897 0 12.664 0zm0 1.842C8.13 1.842 4.97 5.204 4.97 8.22c0 2.553-.75 3.733-1.41 4.774-.531.836-.95 1.497-.95 2.932.216 2.316 1.831 3.533 10.055 3.533 8.178 0 9.844-1.271 10.06-3.613-.004-1.355-.423-2.016-.954-2.852-.662-1.041-1.41-2.221-1.41-4.774 0-3.017-3.161-6.38-7.696-6.38z" clipRule="evenodd"/></svg>,
  <svg key="m-chat" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path className="_dark_svg" fill="#000" fillOpacity=".6" fillRule="evenodd" d="M12.002 0c3.208 0 6.223 1.239 8.487 3.489 4.681 4.648 4.681 12.211 0 16.86-2.294 2.28-5.384 3.486-8.514 3.486-1.706 0-3.423-.358-5.03-1.097-.474-.188-.917-.366-1.235-.366-.366.003-.859.171-1.335.334-.976.333-2.19.748-3.09-.142-.895-.89-.482-2.093-.149-3.061.164-.477.333-.97.333-1.342 0-.306-.149-.697-.376-1.259C-1 12.417-.032 7.011 3.516 3.49A11.96 11.96 0 0112.002 0zm.001 1.663a10.293 10.293 0 00-7.304 3.003A10.253 10.253 0 002.63 16.244c.261.642.514 1.267.514 1.917 0 .649-.225 1.302-.422 1.878-.163.475-.41 1.191-.252 1.349.156.16.881-.092 1.36-.255.576-.195 1.228-.42 1.874-.424.648 0 1.259.244 1.905.503 3.96 1.818 8.645.99 11.697-2.039 4.026-4 4.026-10.509 0-14.508a10.294 10.294 0 00-7.303-3.002zm4.407 9.607c.617 0 1.117.495 1.117 1.109 0 .613-.5 1.109-1.117 1.109a1.116 1.116 0 01-1.12-1.11c0-.613.494-1.108 1.11-1.108h.01zm-4.476 0c.616 0 1.117.495 1.117 1.109 0 .613-.5 1.109-1.117 1.109a1.116 1.116 0 01-1.121-1.11c0-.613.493-1.108 1.11-1.108h.01zm-4.477 0c.617 0 1.117.495 1.117 1.109 0 .613-.5 1.109-1.117 1.109a1.116 1.116 0 01-1.12-1.11c0-.613.494-1.108 1.11-1.108h.01z" clipRule="evenodd"/></svg>,
];

function DropdownIcon({ type }: { type: "settings" | "help" | "logout" }) {
  if (type === "settings") return <svg width="18" height="19" fill="none" viewBox="0 0 18 19"><circle cx="9" cy="9.5" r="3" stroke="#377DFF" strokeWidth="1.5" /><path stroke="#377DFF" strokeWidth="1.5" d="M9 1v2M9 16v2M1 9.5h2M15 9.5h2M3.3 3.8l1.4 1.4M13.3 13.8l1.4 1.4M14.7 3.8l-1.4 1.4M4.7 13.8l-1.4 1.4" /></svg>;
  if (type === "help") return <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" stroke="#377DFF" strokeWidth="1.5" /><path stroke="#377DFF" strokeLinecap="round" strokeWidth="1.5" d="M7.5 7.5a2.6 2.6 0 015 1c0 1.7-2.5 2.5-2.5 2.5M10 14.5h.01" /></svg>;
  return <svg width="19" height="19" fill="none" viewBox="0 0 19 19"><path stroke="#377DFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.7 18H2.9A1.9 1.9 0 011 16.1V2.9A1.9 1.9 0 012.9 1h3.8M13.3 14.2L18 9.5l-4.7-4.7M18 9.5H6.7" /></svg>;
}

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLLIElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  function loadNotifications() {
    if (!user) return;
    api<{ notifications: Notification[]; unreadCount: number }>(`/notifications?limit=5&unread=${onlyUnread}`)
      .then((data) => { setNotifications(data.notifications); setUnreadCount(data.unreadCount); })
      .catch(() => undefined);
  }

  useEffect(loadNotifications, [user, notificationsOpen, onlyUnread]);

  const loadMessageUnreadCount = useCallback(() => {
    if (!user) return;
    api<{ conversations: { unreadCount: number }[] }>("/messages")
      .then((data) => setMessageUnreadCount(data.conversations.reduce((sum, c) => sum + c.unreadCount, 0)))
      .catch(() => undefined);
  }, [user]);

  useEffect(() => { loadMessageUnreadCount(); }, [loadMessageUnreadCount, pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => {
    document.body.classList.toggle("appify-mobile-menu-open", mobileMenuOpen);
    return () => document.body.classList.remove("appify-mobile-menu-open");
  }, [mobileMenuOpen]);

  useEffect(() => {
    function closeOpenMenus(event: MouseEvent) {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) setProfileOpen(false);
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(target)) setNotificationsOpen(false);
    }

    document.addEventListener("mousedown", closeOpenMenus);
    return () => document.removeEventListener("mousedown", closeOpenMenus);
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = io(realtimeUrl, realtimeAuthOptions());
    socket.on("notification:new", (payload) => {
      if (payload.userId !== user.id) return;
      setUnreadCount((count) => count + 1);
      api<{ notifications: Notification[] }>("/notifications?limit=5").then((data) => setNotifications(data.notifications));
    });
    socket.on("message:new", (payload) => {
      if (payload.recipients?.includes(user.id)) setMessageUnreadCount((count) => count + 1);
    });
    return () => { socket.disconnect(); };
  }, [user]);

  function search(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  const destinations = ["/feed", "/friends", "/notifications", "/messages"];
  const activeIndex = destinations.findIndex((dest) => pathname.startsWith(dest));
  const currentActive = activeIndex >= 0 ? activeIndex : 0;

  async function signOut() {
    setMobileMenuOpen(false);
    await logout();
    router.replace("/login");
  }

  const mobileMenuItems = [
    { label: "Feed", path: "/feed" },
    { label: "Friends", path: "/friends" },
    { label: "Notifications", path: "/notifications", count: unreadCount },
    { label: "Messages", path: "/messages", count: messageUnreadCount },
    { label: "Groups", path: "/groups" },
    { label: "Events", path: "/events" },
    { label: "Saved", path: "/saved" },
    { label: "Settings", path: "/settings" },
    { label: "Help & Support", path: "/support" },
  ];

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10">
        <div className="container _custom_container">
          <div className="_logo_wrap"><button className="navbar-brand _logo_btn" onClick={() => router.push("/feed")}><img src="/assets/images/logo.svg" alt="Buddy Script" className="_nav_logo" /></button></div>
          <button className="navbar-toggler bg-light" type="button"><span className="navbar-toggler-icon" /></button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <div className="_header_form ms-auto"><form className="_header_form_grp" onSubmit={search}><SearchIcon className="_header_form_svg" /><input className="form-control me-2 _inpt1" type="search" placeholder="Search posts, people, and more" aria-label="Search" value={query} onChange={(event) => setQuery(event.target.value)} /></form></div>
            <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list ms-auto _mar_r8">
              {navIcons.map((icon, index) => <li className="nav-item _header_nav_item" key={index} ref={index === 2 ? notificationsMenuRef : undefined}>
                <button className={`nav-link _header_nav_link ${index === currentActive ? "_header_nav_link_active" : ""} ${index === 2 || index === 3 ? "_header_notify_btn" : ""}`} onClick={() => index === 2 ? setNotificationsOpen((value) => !value) : router.push(destinations[index])}>
                  {icon}{index === 2 && unreadCount > 0 && <span className="_counting">{unreadCount}</span>}{index === 3 && messageUnreadCount > 0 && <span className="_counting">{messageUnreadCount}</span>}
                </button>
                {index === 2 && notificationsOpen && <div className="_notification_dropdown show">
                  <div className="_notifications_content">
                    <h4 className="_notifications_content_title">Notifications</h4>

                  </div>
                  <div className="_notifications_drop_box">
                    <div className="_notifications_drop_btn_grp">
                      <button className={!onlyUnread ? "_notifications_btn_link" : "_notifications_btn_link1"} onClick={(e) => { e.stopPropagation(); setOnlyUnread(false); }}>All</button>
                      <button className={onlyUnread ? "_notifications_btn_link" : "_notifications_btn_link1"} onClick={(e) => { e.stopPropagation(); setOnlyUnread(true); }}>Unread</button>
                    </div>
                    <div className="_notifications_all">
                      {notifications.map((item) => <div className="_notification_box" key={item.id} onClick={async (e) => { e.stopPropagation(); if (!item.isRead) { await api(`/notifications/${item.id}/read`, { method: "PATCH" }).catch(() => undefined); loadNotifications(); } const route = item.type === "friend_request" ? "/friends" : item.type === "message" ? "/messages" : item.type === "follow" && item.actor ? profilePath(item.actor) : "/notifications"; router.push(route); }}>
                        <div className="_notification_image"><img src={mediaUrl(item.actor?.avatarUrl)} alt="" className="_notify_img" /></div>
                        <div className="_notification_txt">
                          <p className="_notification_para"><span className="_notify_txt_link"><button className="appify-link-button" onClick={(e) => { e.stopPropagation(); if (item.actor) router.push(profilePath(item.actor)); }}>{item.actor?.name}</button></span> {item.message}</p>
                          <div className="_nitification_time"><span>{item.createdAt}</span></div>
                        </div>
                      </div>)}
                    </div>
                  </div>
                </div>}
              </li>)}
            </ul>
            <div className="_header_nav_profile" ref={profileMenuRef}>
              <div className="_header_nav_profile_image"><img src={mediaUrl(user?.avatarUrl)} alt="" className="_nav_profile_img" /></div>
              <button className="_header_nav_dropdown" type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Toggle profile menu"><span className="_header_nav_para">{user?.name}</span><span className="_header_nav_dropdown_btn _dropdown_toggle"><svg width="10" height="6" fill="none" viewBox="0 0 10 6"><path fill="#112032" d="M5 5l4-4 .7.7-4.4 4.4a.5.5 0 01-.7 0L.3 1.7 1 1l4 4z" /></svg></span></button>
              <div className={`_nav_profile_dropdown _profile_dropdown ${profileOpen ? "show" : ""}`}>
                <button className="_nav_profile_dropdown_info" onClick={() => user && router.push(profilePath(user))}><div className="_nav_profile_dropdown_image"><img src={mediaUrl(user?.avatarUrl)} alt="" className="_nav_drop_img" /></div><div className="_nav_profile_dropdown_info_txt"><h4 className="_nav_dropdown_title">{user?.name}</h4><span className="_nav_drop_profile">View Profile</span></div></button>
                <hr />
                <ul className="_nav_dropdown_list">
                  {[
                    { label: "Settings", type: "settings" as const },
                    { label: "Help & Support", type: "help" as const },
                    { label: "Log Out", type: "logout" as const },
                  ].map((item) => <li className="_nav_dropdown_list_item" key={item.label}><button className="_nav_dropdown_link" onClick={item.type === "logout" ? signOut : () => router.push(item.type === "settings" ? "/settings" : "/support")}><div className="_nav_drop_info"><span><DropdownIcon type={item.type} /></span>{item.label}</div><span className="_nav_drop_btn_link">&gt;</span></button></li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="_header_mobile_menu">
        <div className="_header_mobile_menu_wrap">
          <div className="container">
            <div className="_header_mobile_menu_top_inner">
              <button className="_logo_btn" onClick={() => router.push("/feed")} aria-label="Go to feed"><img src="/assets/images/logo.svg" alt="Buddy Script" className="_nav_logo" /></button>
              <button className="appify-mobile-icon-button" type="button" onClick={() => setMobileSearchOpen((value) => !value)} aria-label="Search" aria-expanded={mobileSearchOpen}><SearchIcon /></button>
            </div>
            <form className={`appify-mobile-search ${mobileSearchOpen ? "is-open" : ""}`} onSubmit={search}>
              <SearchIcon className="appify-mobile-search-icon" />
              <input ref={mobileSearchInputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts, people, and more" aria-label="Search posts, people, and more" />
              {query && <button className="appify-mobile-search-clear" type="button" onClick={() => setQuery("")} aria-label="Clear search">&times;</button>}
            </form>
          </div>
        </div>
      </div>
      <div className="_mobile_navigation_bottom_wrapper"><div className="_mobile_navigation_bottom_wrap"><ul className="_mobile_navigation_bottom_list">
        {destinations.map((dest, idx) => (
          <li className="_mobile_navigation_bottom_item" key={idx}>
            <button className={`_mobile_navigation_bottom_link ${idx === currentActive ? "_mobile_navigation_bottom_link_active" : ""} ${idx === 2 || idx === 3 ? "_header_notify_btn" : ""}`} onClick={() => router.push(dest)} aria-label={["Feed", "Friends", "Notifications", "Messages"][idx]}>
              {mobileIcons[idx]}{idx === 2 && unreadCount > 0 && <span className="_counting">{unreadCount}</span>}{idx === 3 && messageUnreadCount > 0 && <span className="_counting">{messageUnreadCount}</span>}
            </button>
          </li>
        ))}
        <li className="_mobile_navigation_bottom_item"><div className="_header_mobile_toggle"><button className="_header_mobile_btn_link" type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" aria-expanded={mobileMenuOpen}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" fill="none" viewBox="0 0 18 14"><path stroke="#666" strokeLinecap="round" strokeWidth="1.5" d="M1 1h16M1 7h16M1 13h16"/></svg></button></div></li>
      </ul></div></div>
      <div className={`appify-mobile-menu-backdrop ${mobileMenuOpen ? "is-open" : ""}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`appify-mobile-drawer ${mobileMenuOpen ? "is-open" : ""}`} aria-hidden={!mobileMenuOpen}>
        <div className="appify-mobile-drawer-header">
          <button className="appify-mobile-profile" type="button" onClick={() => user && router.push(profilePath(user))}>
            <img src={mediaUrl(user?.avatarUrl)} alt="" />
            <span><strong>{user?.name}</strong><small>View profile</small></span>
          </button>
          <button className="appify-mobile-drawer-close" type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">&times;</button>
        </div>
        <nav className="appify-mobile-drawer-nav" aria-label="Mobile menu">
          {mobileMenuItems.map((item) => (
            <button className={pathname.startsWith(item.path) ? "is-active" : ""} type="button" key={item.path} onClick={() => router.push(item.path)}>
              <span>{item.label}</span>
              {!!item.count && <em>{item.count}</em>}
            </button>
          ))}
        </nav>
        <button className="appify-mobile-logout" type="button" onClick={signOut}>Log Out</button>
      </aside>
    </>
  );
}
