"use client";

import { useCallback, useEffect, useState } from "react";
import { SocialShell } from "@/components/layout/social-shell";
import { api, mediaUrl } from "@/lib/api";
import type { Insights } from "@/lib/types";

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await api<{ insights: Insights }>("/insights");
      setData(res.insights);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <SocialShell><div className="appify-feed-loading">Loading insights...</div></SocialShell>;
  if (!data) return <SocialShell><div className="appify-empty">Unable to load insights.</div></SocialShell>;

  const maxActivity = Math.max(1, ...data.activity.map((d) => Math.max(d.posts, d.reactions, d.comments)));
  const maxGrowth = Math.max(1, ...data.followerGrowth.map((d) => d.gained));

  const s = data.summary;
  const statCards = [
    { label: "Posts", value: s.totalPosts, color: "#377dff" },
    { label: "Reactions", value: s.reactionsReceived, color: "#e53e3e" },
    { label: "Comments", value: s.commentsReceived, color: "#38a169" },
    { label: "Shares", value: s.sharesReceived, color: "#805ad5" },
    { label: "Followers", value: s.followers, color: "#d69e2e" },
    { label: "Following", value: s.following, color: "#319795" },
    { label: "Friends", value: s.friends, color: "#dd6b20" },
    { label: "Groups", value: s.groupsJoined, color: "#667eea" },
    { label: "Events", value: s.eventsAttended, color: "#f687b3" },
  ];

  return <SocialShell>
    <div className="appify-page-card">
      <h2 style={{ margin: "0 0 20px", fontSize: 22 }}>Insights</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
        {statCards.map((card) => <div key={card.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 14px", textAlign: "center", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{card.label}</div>
        </div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 20, border: "1px solid #e2e8f0", minWidth: 0 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Activity (last 14 days)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, overflow: "hidden", minWidth: 0 }}>
            {data.activity.map((day) => {
              const hPosts = day.posts > 0 ? Math.max(4, (day.posts / maxActivity) * 120) : 0;
              const hReact = day.reactions > 0 ? Math.max(4, (day.reactions / maxActivity) * 120) : 0;
              const hComm = day.comments > 0 ? Math.max(4, (day.comments / maxActivity) * 120) : 0;
              return <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: 120 }}>
                  <div style={{ width: "60%", background: "#38a169", borderRadius: "3px 3px 0 0", height: hComm, minHeight: hComm > 0 ? 4 : 0 }} title={`${day.date} comments: ${day.comments}`} />
                  <div style={{ width: "80%", background: "#e53e3e", borderRadius: "3px 3px 0 0", height: hReact, minHeight: hReact > 0 ? 4 : 0 }} title={`${day.date} reactions: ${day.reactions}`} />
                  <div style={{ width: "100%", background: "#377dff", borderRadius: "3px 3px 0 0", height: hPosts, minHeight: hPosts > 0 ? 4 : 0 }} title={`${day.date} posts: ${day.posts}`} />
                </div>
                <span style={{ fontSize: 9, color: "#94a3b8", writingMode: "vertical-lr", rotate: "180deg", marginTop: 2 }}>{day.date.slice(5)}</span>
              </div>;
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "#64748b" }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#377dff", borderRadius: 2, marginRight: 4 }} /> Posts</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#e53e3e", borderRadius: 2, marginRight: 4 }} /> Reactions</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#38a169", borderRadius: 2, marginRight: 4 }} /> Comments</span>
          </div>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 20, border: "1px solid #e2e8f0", minWidth: 0 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>New Followers (last 14 days)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, overflow: "hidden", minWidth: 0 }}>
            {data.followerGrowth.map((day) => {
              const h = day.gained > 0 ? Math.max(4, (day.gained / maxGrowth) * 100) : 0;
              return <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
                <div style={{ width: "100%", background: "#d69e2e", borderRadius: "3px 3px 0 0", height: h, minHeight: h > 0 ? 4 : 0 }} title={`${day.date}: ${day.gained} new followers`} />
                <span style={{ fontSize: 9, color: "#94a3b8" }}>{day.date.slice(5)}</span>
              </div>;
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 20, border: "1px solid #e2e8f0", minWidth: 0 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Engagement Rate</h3>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#377dff" }}>{data.engagementRate}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Avg reactions + comments per post</div>
          <div style={{ marginTop: 14, display: "flex", gap: 4, alignItems: "flex-end", height: 80, overflow: "hidden", minWidth: 0 }}>
            {data.engagementByDay.map((day) => {
              const h = day.rate > 0 ? Math.max(3, (day.rate / Math.max(0.01, ...data.engagementByDay.map((d) => d.rate))) * 60) : 0;
              return <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 0 }}>
                <div style={{ width: "100%", background: "#667eea", borderRadius: "3px 3px 0 0", height: h, minHeight: h > 0 ? 3 : 0 }} title={`${day.date}: ${day.rate}`} />
                <span style={{ fontSize: 8, color: "#94a3b8" }}>{day.date.slice(8)}</span>
              </div>;
            })}
          </div>
        </div>

        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 20, border: "1px solid #e2e8f0", minWidth: 0 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Top Posts</h3>
          {data.topPosts.length === 0 ? <p style={{ color: "#94a3b8", fontSize: 13 }}>No posts yet.</p> : data.topPosts.map((post, i) => <div key={post.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: i < data.topPosts.length - 1 ? "1px solid #e2e8f0" : "none" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#377dff", minWidth: 20 }}>#{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {post.imageUrl && <img src={mediaUrl(post.imageUrl)} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", float: "left", marginRight: 8 }} />}
              <div style={{ fontSize: 13, color: "#112032", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.content || "(image post)"}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{post.reactionCount} reactions · {post.commentCount} comments</div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </SocialShell>;
}
