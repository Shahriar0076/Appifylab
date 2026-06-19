"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, mediaUrl } from "@/lib/api";
import { profilePath } from "@/lib/routes";
import { timeAgo } from "@/lib/time";
import type { Post, ReactionType } from "@/lib/types";
import { CommentThread } from "./comment-thread";
import { LikerModal } from "./liker-modal";

export function PostCard({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const router = useRouter();
  const reactions = post.reactions || { count: 0, currentUserReaction: null, users: [] };
  const comments = post.comments || [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  const [visibility, setVisibility] = useState(post.visibility);
  const [articleTitle, setArticleTitle] = useState(post.article?.title || "");
  const [articleBody, setArticleBody] = useState(post.article?.body || "");

  async function react(type: ReactionType) {
    await api(`/posts/reactions/post/${post.id}`, { method: "POST", body: JSON.stringify({ reactionType: type }) });
    onChanged();
  }

  async function save() {
    await api(`/posts/${post.id}/save`, { method: "POST" });
    setMenuOpen(false);
    onChanged();
  }

  async function hide() {
    await api(`/posts/${post.id}/hide`, { method: "POST" });
    onChanged();
  }

  async function remove() {
    if (!window.confirm("Delete this post?")) return;
    await api(`/posts/${post.id}`, { method: "DELETE" });
    onChanged();
  }

  async function update() {
    await api(`/posts/${post.id}`, {
      method: "PATCH",
      body: JSON.stringify({ content, visibility, articleTitle, articleBody }),
    });
    setEditing(false);
    onChanged();
  }

  async function share() {
    const content = window.prompt("Add a message to this shared post (optional):", "") ?? null;
    if (content === null) return;
    await api(`/posts/${post.id}/share`, { method: "POST", body: JSON.stringify({ content, visibility: "public" }) });
    onChanged();
  }

  async function toggleNotifications() {
    await api(`/posts/${post.id}/subscription`, { method: "POST" });
    setMenuOpen(false);
    onChanged();
  }

  return (
    <article className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image"><img src={mediaUrl(post.author.avatarUrl)} alt="" className="_post_img" /></div>
            <div className="_feed_inner_timeline_post_box_txt"><h4 className="_feed_inner_timeline_post_box_title"><button className="appify-link-button" onClick={() => router.push(profilePath(post.author))}>{post.author.name}</button></h4><p className="_feed_inner_timeline_post_box_para">{timeAgo(post.createdAt)} . <span>{post.group ? post.group.name : post.visibility === "public" ? "Public" : "Private"}</span></p></div>
          </div>
          <div className="_feed_inner_timeline_post_box_dropdown appify-post-menu">
            <div className="_feed_timeline_post_dropdown"><button className="_feed_timeline_post_dropdown_link" onClick={() => setMenuOpen((value) => !value)}><svg width="4" height="17" fill="none" viewBox="0 0 4 17"><circle cx="2" cy="2" r="2" fill="#C4C4C4" /><circle cx="2" cy="8" r="2" fill="#C4C4C4" /><circle cx="2" cy="15" r="2" fill="#C4C4C4" /></svg></button></div>
            {menuOpen && <div className="appify-post-menu-panel"><button onClick={save}>{post.isSaved ? "Unsave Post" : "Save Post"}</button><button onClick={toggleNotifications}>{post.notificationsEnabled ? "Turn Off Notification" : "Turn On Notification"}</button><button onClick={hide}>Hide</button>{post.isOwner && <button onClick={() => { setEditing(true); setMenuOpen(false); }}>Edit Post</button>}{post.isOwner && <button onClick={remove}>Delete Post</button>}</div>}
          </div>
        </div>
        {editing ? <div><textarea className="form-control _textarea" value={content} onChange={(event) => setContent(event.target.value)} />{post.article && <><input className="form-control _inpt1" value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} /><textarea className="form-control _textarea" value={articleBody} onChange={(event) => setArticleBody(event.target.value)} /></>}{!post.group && <select className="appify-visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")}><option value="public">Public</option><option value="private">Private</option></select>}<button className="appify-comment-submit" onClick={update}>Save</button> <button className="appify-liker-button" onClick={() => setEditing(false)}>Cancel</button></div> : <>{post.content && <h4 className="_feed_inner_timeline_post_title">{post.content}</h4>}{post.article && <div className="appify-article"><span>Article</span><h3>{post.article.title}</h3><p>{post.article.body}</p></div>}</>}
        {post.imageUrl && <div className="_feed_inner_timeline_image"><img src={mediaUrl(post.imageUrl)} alt="Post attachment" className="_time_img" /></div>}
        {post.sharedPost && <div className="appify-shared-post"><strong><button className="appify-link-button" onClick={() => router.push(profilePath(post.sharedPost!.author))}>{post.sharedPost.author.name}</button></strong><p>{post.sharedPost.content}</p>{post.sharedPost.imageUrl && <img src={mediaUrl(post.sharedPost.imageUrl)} alt="Shared post attachment" />}</div>}
        {post.sharedComment && <div className="appify-shared-post"><span>Shared comment</span><strong><button className="appify-link-button" onClick={() => router.push(profilePath(post.sharedComment!.author))}>{post.sharedComment.author.name}</button></strong><p>{post.sharedComment.content}</p>{post.sharedComment.imageUrl && <img src={mediaUrl(post.sharedComment.imageUrl)} alt="Shared comment attachment" />}</div>}
      </div>
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image">{reactions.users.slice(0, 5).map((user, index) => <img key={user.id} src={mediaUrl(user.avatarUrl)} alt="" className={index ? "_react_img" : "_react_img1"} />)}<button className="appify-liker-button" onClick={() => setShowLikers(true)}>{reactions.count ? `${reactions.count}+` : "0"}</button></div>
        <div className="_feed_inner_timeline_total_reacts_txt"><p className="_feed_inner_timeline_total_reacts_para1"><span>{post.commentCount || 0}</span> Comment</p><p className="_feed_inner_timeline_total_reacts_para2"><span>{post.shareCount || 0}</span> Share</p></div>
      </div>
      <div className="_feed_inner_timeline_reaction">
        <button className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${reactions.currentUserReaction ? "_feed_reaction_active" : ""}`} onClick={() => react(reactions.currentUserReaction || "like")} onContextMenu={(event) => { event.preventDefault(); void react("love"); }}>
          <span className="_feed_inner_timeline_reaction_link"><span><svg width="19" height="19" fill="none" viewBox="0 0 19 19"><path fill={reactions.currentUserReaction ? "#377DFF" : "none"} stroke={reactions.currentUserReaction ? "#377DFF" : "#000"} strokeWidth="1.5" d="M6.7 8.2V4.5A2.5 2.5 0 019.2 2l.7 5h5.6a2 2 0 012 2.4l-1.2 6a2 2 0 01-2 1.6H6.7V8.2zM6.7 17H3a1.5 1.5 0 01-1.5-1.5V9.7A1.5 1.5 0 013 8.2h3.7" /></svg>{reactions.currentUserReaction === "love" ? "Love" : reactions.currentUserReaction === "haha" ? "Haha" : "Like"}</span></span>
        </button>
        <button className="_feed_inner_timeline_reaction_comment _feed_reaction"><span className="_feed_inner_timeline_reaction_link"><span><svg className="_reaction_svg" width="21" height="21" fill="none" viewBox="0 0 21 21"><path stroke="#000" d="M1 10.5A9.5 9.5 0 0110.5 1 9.5 9.5 0 0120 10.5V20h-9.5A9.5 9.5 0 011 10.5z" /><path stroke="#000" strokeLinecap="round" d="M7 9.3h7M10.5 14h3.5" /></svg>Comment</span></span></button>
        <button className="_feed_inner_timeline_reaction_share _feed_reaction" onClick={share}><span className="_feed_inner_timeline_reaction_link"><span><svg className="_reaction_svg" width="24" height="21" fill="none" viewBox="0 0 24 21"><path stroke="#000" strokeLinejoin="round" d="M23 10.5L13 1v5.4C3.3 6.4 1 13.3 1 20c2.8-3.5 5.2-5.4 12-5.4V20l10-9.5z" /></svg>Share</span></span></button>
      </div>
      <CommentThread postId={post.id} comments={comments} nextCursor={post.commentsNextCursor || null} onChanged={onChanged} />
      {showLikers && <LikerModal reactions={reactions} onClose={() => setShowLikers(false)} />}
    </article>
  );
}
