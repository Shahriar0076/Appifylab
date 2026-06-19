"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { api, mediaUrl } from "@/lib/api";
import { useRouter } from "next/navigation";

function ComposerIcon({ type }: { type: "photo" | "video" | "event" | "article" }) {
  if (type === "photo") return <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="#666" d="M14 0c3 0 5 2.4 5 5.9v8.2c0 3.5-2 5.9-5 5.9H6c-3 0-5-2.4-5-5.9V5.9C1 2.4 3 0 6 0h8zm.6 10.2l2 2.3a.8.8 0 01-1 1l-1.9-2.1a.8.8 0 00-1.2-.1l-2.1 2.8a1.9 1.9 0 01-2.8.3l-.8-.9a.6.6 0 00-.9-.1L4.5 15a.7.7 0 01-1-.9l1.4-1.6a1.9 1.9 0 012.8-.1l.8.9a.6.6 0 00.9 0l2-2.8a2 2 0 013.2-.3zM6.8 4.6a2.4 2.4 0 100 4.9 2.4 2.4 0 000-4.9z" /></svg>;
  if (type === "video") return <svg width="22" height="24" fill="none" viewBox="0 0 22 24"><path fill="#666" d="M11.5 4.5c2.2 0 3.7 1.5 3.9 3.8l2.4-1.1c1.1-.5 2.3.3 2.3 1.7v6.6c0 1.3-1.2 2.2-2.3 1.7l-2.4-1.1c-.2 2.3-1.7 3.8-3.9 3.8H5.8c-2.4 0-4-1.7-4-4.2v-7c0-2.5 1.6-4.2 4-4.2h5.7z" /></svg>;
  if (type === "event") return <svg width="22" height="24" fill="none" viewBox="0 0 22 24"><path fill="#666" d="M14.4 2c.4 0 .7.3.7.7v.8c2.6.2 4.2 2 4.2 5V17c0 3.1-1.8 5-4.7 5H7.4c-2.9 0-4.7-1.9-4.7-5.1V8.5c0-3 1.6-4.8 4.2-5v-.8c0-.4.3-.7.7-.7s.6.3.6.7v.8h5.6v-.8c0-.4.3-.7.6-.7zM18 10.3H4v6.6c0 2.5 1.2 3.7 3.4 3.7h7.2c2.2 0 3.4-1.2 3.4-3.6v-6.7z" /></svg>;
  return <svg width="18" height="20" fill="none" viewBox="0 0 18 20"><path fill="#666" d="M12.5 0c3 0 4.7 1.9 4.7 5.1v9.7c0 3.3-1.8 5.2-4.7 5.2H5.4C2.5 20 .7 18.1.7 14.8V5.2C.7 1.9 2.5 0 5.4 0h7.1zm-.3 13.5H5.7a.7.7 0 000 1.5h6.5a.7.7 0 000-1.5zm0-4.2H5.7a.7.7 0 000 1.4h6.5a.7.7 0 000-1.4zM8.2 5H5.7a.7.7 0 000 1.5h2.5a.7.7 0 000-1.5z" /></svg>;
}

type ComposerProps = {
  onCreated: () => void;
  endpoint?: string;
  placeholder?: string;
  audienceLabel?: string;
};

export function Composer({
  onCreated,
  endpoint = "/posts",
  placeholder = "What's on your mind?",
  audienceLabel,
}: ComposerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [postType, setPostType] = useState<"standard" | "article">("standard");
  const [articleTitle, setArticleTitle] = useState("");
  const [articleBody, setArticleBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const body = new FormData();
    body.append("content", content);
    body.append("visibility", visibility);
    body.append("postType", postType);
    if (postType === "article") {
      body.append("articleTitle", articleTitle);
      body.append("articleBody", articleBody);
    }
    if (image) body.append("image", image);
    try {
      await api(endpoint, { method: "POST", body });
      setContent("");
      setPostType("standard");
      setArticleTitle("");
      setArticleBody("");
      setImage(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      if (inputRef.current) inputRef.current.value = "";
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to publish post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16" onSubmit={submit}>
      <div className="_feed_inner_text_area_box">
        <div className="_feed_inner_text_area_box_image"><img src={mediaUrl(user?.avatarUrl)} alt="" className="_txt_img" /></div>
        <div className="form-floating _feed_inner_text_area_box_form"><textarea className="form-control _textarea" placeholder={placeholder} value={content} onChange={(event) => setContent(event.target.value)} /><label className="_feed_textarea_label">{placeholder} <svg width="23" height="24" fill="none" viewBox="0 0 23 24"><path fill="#666" d="M13.4 4.4a2.9 2.9 0 014.1 0l1.2 1.3a3.2 3.2 0 010 4.4l-8.9 9.5a2.6 2.6 0 01-1.9.9H4.3a.6.6 0 01-.6-.7l.1-3.9c0-.7.3-1.4.8-2l8.8-9.5zm-.7 2.6l-7.3 7.8c-.3.3-.4.7-.4 1.1l-.1 3.3h3c.4 0 .7-.1 1-.4l7.4-7.9L12.7 7zm4-1.7a1.6 1.6 0 00-2.4 0l-.7.8 3.6 3.8.7-.7a1.9 1.9 0 000-2.6l-1.2-1.3z" /></svg></label></div>
        {audienceLabel ? <span className="appify-visibility">{audienceLabel}</span> : <button type="button" className="appify-visibility" onClick={() => setVisibility((value) => value === "public" ? "private" : "public")}>{visibility === "public" ? "Public" : "Private"} <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
      </div>
      {postType === "article" && <div className="appify-article-editor">
        <input className="form-control _inpt1" placeholder="Article title" value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} required />
        <textarea className="form-control _textarea" placeholder="Write your article" value={articleBody} onChange={(event) => setArticleBody(event.target.value)} required />
        <button type="button" className="appify-link-button" onClick={() => setPostType("standard")}>Cancel article</button>
      </div>}
      {preview && <div className="appify-preview"><img src={preview} alt="Selected upload" /><button type="button" onClick={() => { setImage(null); setPreview(""); }}>x</button></div>}
      <div className="_feed_inner_text_area_bottom">
        <div className="_feed_inner_text_area_item">
          {(["photo", "video", "event", "article"] as const).map((type) => <div className={`_feed_inner_text_area_bottom_${type} _feed_common`} key={type}><button type="button" disabled={type === "video"} title={type === "video" ? "Video uploads are outside this project scope." : undefined} className="_feed_inner_text_area_bottom_photo_link" onClick={type === "photo" ? () => inputRef.current?.click() : type === "event" ? () => router.push("/events") : type === "article" ? () => setPostType("article") : undefined}><span className="_feed_inner_text_area_bottom_photo_iamge _mar_img"><ComposerIcon type={type} /></span>{type[0].toUpperCase() + type.slice(1)}</button></div>)}
          <input ref={inputRef} className="appify-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectImage} />
        </div>
        <div className="_feed_inner_text_area_btn"><button disabled={submitting} type="submit" className="_feed_inner_text_area_btn_link"><svg className="_mar_img" width="14" height="13" fill="none" viewBox="0 0 14 13"><path fill="#fff" d="M6.4 7.9l2.4 4a.3.3 0 00.6-.1l3.1-10.3a.3.3 0 00-.4-.4L1.8 4a.3.3 0 00-.1.6l4 2.5 3.5-3.5a.5.5 0 01.7.7L6.4 8z" /></svg><span>{submitting ? "Posting..." : "Post"}</span></button></div>
      </div>
      {error && <p className="appify-error">{error}</p>}
    </form>
  );
}
