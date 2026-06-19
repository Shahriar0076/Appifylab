"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import type { Comment, ReactionType } from "@/lib/types";
import { profilePath } from "@/lib/routes";
import { timeAgo } from "@/lib/time";
import { LikerModal } from "./liker-modal";

function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

function AttachmentIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path fill="#000" fillOpacity=".46" d="M11 1.3c2.2 0 3.7 1.6 3.7 4v5.4c0 2.3-1.5 3.9-3.7 3.9H5.2c-2.3 0-3.8-1.6-3.8-4V5.3c0-2.4 1.5-4 3.8-4H11zM5.7 4.4a1.7 1.7 0 100 3.4 1.7 1.7 0 000-3.4zm5.6 3.7a1.6 1.6 0 00-2.3.2l-1.5 1.8a.5.5 0 01-.7 0l-.6-.6a1.4 1.4 0 00-2 .1l-1 1.1a.5.5 0 10.7.7l1-1.1a.4.4 0 01.6 0l.6.6a1.5 1.5 0 002.1 0l1.6-1.9a.6.6 0 01.8-.1l1.8 1.8a.5.5 0 10.7-.7l-1.8-1.9z" /></svg>;
}

function CommentItem({ comment, onChanged, reply = false, user }: { comment: Comment; onChanged: () => void; reply?: boolean; user: { id: number; avatarUrl: string | null } | null }) {
  const router = useRouter();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showLikers, setShowLikers] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const replyImage = useRef<HTMLInputElement>(null);

  async function react(type: ReactionType) {
    await api(`/posts/reactions/comment/${comment.id}`, { method: "POST", body: JSON.stringify({ reactionType: type }) });
    onChanged();
  }

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!replyText.trim()) return;
    const body = new FormData();
    body.append("content", replyText);
    body.append("parentId", String(comment.id));
    if (replyImage.current?.files?.[0]) body.append("image", replyImage.current.files[0]);
    await api(`/posts/${comment.postId}/comments`, { method: "POST", body });
    setReplyText("");
    setShowReply(false);
    onChanged();
  }

  async function saveEdit() {
    await api(`/posts/comments/${comment.id}`, { method: "PATCH", body: JSON.stringify({ content: editText }) });
    setEditing(false); onChanged();
  }

  async function remove() {
    if (!window.confirm("Delete this comment?")) return;
    await api(`/posts/comments/${comment.id}`, { method: "DELETE" });
    onChanged();
  }

  async function share() {
    const content = window.prompt("Add a message to this shared comment (optional):", "");
    if (content === null) return;
    await api(`/posts/comments/${comment.id}/share`, {
      method: "POST",
      body: JSON.stringify({ content, visibility: "public" }),
    });
    onChanged();
  }

  return (
    <div className="_comment_main" style={reply ? { marginLeft: 48 } : undefined}>
      <div className="_comment_image"><img src={mediaUrl(comment.author.avatarUrl)} alt="" className="_comment_img1" /></div>
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_details_top"><div className="_comment_name"><h4 className="_comment_name_title"><button className="appify-link-button" onClick={() => router.push(profilePath(comment.author))}>{comment.author.name}</button></h4></div></div>
          <div className="_comment_status">{editing ? <div><textarea className="form-control _comment_textarea" value={editText} onChange={(e) => setEditText(e.target.value)} /><button className="appify-link-button" onClick={saveEdit}>Save</button></div> : <p className="_comment_status_text"><span>{comment.content}</span></p>}</div>
          {comment.imageUrl && <div className="appify-preview"><img src={mediaUrl(comment.imageUrl)} alt="" /></div>}
          {comment.reactions.count > 0 && (
            <button className="appify-liker-button" onClick={() => setShowLikers(true)}>
              <div className="_total_reactions">
                <div className="_total_react">
                  <span className="_reaction_like">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-thumbs-up"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                  </span>
                </div>
                <span className="_total">{comment.reactions.count}</span>
              </div>
            </button>
          )}
          <div className="_comment_reply"><div className="_comment_reply_num"><ul className="_comment_reply_list"><li><button className="appify-link-button" onClick={() => react("like")}>{comment.reactions.currentUserReaction ? "Unlike" : "Like"}.</button></li>{!reply && <li><button className="appify-link-button" onClick={() => setShowReply((value) => !value)}>Reply.</button></li>}<li><button className="appify-link-button" onClick={share}>Share.</button></li>{comment.isOwner && <li><button className="appify-link-button" onClick={() => setEditing(true)}>Edit.</button></li>}{comment.isOwner && <li><button className="appify-link-button" onClick={remove}>Delete.</button></li>}<li><span className="_time_link"> {timeAgo(comment.createdAt)}</span></li></ul></div></div>
        </div>
        {showReply && <div className="_feed_inner_comment_box"><form className="_feed_inner_comment_box_form" onSubmit={submitReply}><div className="_feed_inner_comment_box_content"><div className="_feed_inner_comment_box_content_image"><img src={mediaUrl(user?.avatarUrl)} alt="" className="_comment_img" /></div><div className="_feed_inner_comment_box_content_txt"><textarea className="form-control _comment_textarea" placeholder="Write a reply" value={replyText} onChange={(event) => setReplyText(event.target.value)} onKeyDown={submitOnEnter} /></div></div><div className="_feed_inner_comment_box_icon"><button type="button" className="_feed_inner_comment_box_icon_btn" onClick={() => replyImage.current?.click()}><AttachmentIcon /></button><input ref={replyImage} className="appify-file-input" type="file" accept="image/*" /></div></form></div>}
        {comment.replies.map((item) => <CommentItem key={item.id} comment={item} onChanged={onChanged} reply user={user} />)}
      </div>
      {showLikers && <LikerModal reactions={comment.reactions} onClose={() => setShowLikers(false)} />}
    </div>
  );
}

export function CommentThread({ postId, comments, nextCursor, onChanged }: { postId: number; comments: Comment[]; nextCursor: number | null; onChanged: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [visibleComments, setVisibleComments] = useState(comments);
  const [olderCursor, setOlderCursor] = useState(nextCursor);
  const image = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisibleComments(comments);
    setOlderCursor(nextCursor);
  }, [comments, nextCursor]);

  async function loadOlder() {
    if (!olderCursor) return;
    const data = await api<{ items: Comment[]; nextCursor: number | null }>(
      `/posts/${postId}/comments?limit=10&cursor=${olderCursor}`,
    );
    setVisibleComments((current) => [...current, ...data.items]);
    setOlderCursor(data.nextCursor);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim() && !image.current?.files?.[0]) return;
    const body = new FormData();
    body.append("content", content);
    if (image.current?.files?.[0]) body.append("image", image.current.files[0]);
    try {
      await api(`/posts/${postId}/comments`, { method: "POST", body });
      setContent("");
      if (image.current) image.current.value = "";
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to comment.");
    }
  }

  return (
    <>
      <div className="_feed_inner_timeline_cooment_area"><div className="_feed_inner_comment_box"><form className="_feed_inner_comment_box_form" onSubmit={submit}><div className="_feed_inner_comment_box_content"><div className="_feed_inner_comment_box_content_image"><img src={mediaUrl(user?.avatarUrl)} alt="" className="_comment_img" /></div><div className="_feed_inner_comment_box_content_txt"><textarea className="form-control _comment_textarea" placeholder="Write a comment" value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={submitOnEnter} /></div></div><div className="_feed_inner_comment_box_icon"><button type="button" className="_feed_inner_comment_box_icon_btn" onClick={() => image.current?.click()}><AttachmentIcon /></button><input ref={image} className="appify-file-input" type="file" accept="image/*" /></div></form>{error && <p className="appify-error">{error}</p>}</div></div>
      <div className="_timline_comment_main">{visibleComments.map((comment) => <CommentItem key={comment.id} comment={comment} onChanged={onChanged} user={user} />)}</div>
      {olderCursor && <div className="appify-load-more"><button className="appify-link-button" onClick={loadOlder}>Load older comments</button></div>}
    </>
  );
}
