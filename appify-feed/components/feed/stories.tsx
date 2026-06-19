"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { api, mediaUrl } from "@/lib/api";
import { profilePath } from "@/lib/routes";

type Story = {
  id: number;
  imageUrl: string;
  viewed: boolean;
  author: { id: number; username: string; name: string; avatarUrl: string | null };
};

export function Stories() {
  const router = useRouter();
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [active, setActive] = useState<Story | null>(null);

  async function load() {
    const data = await api<{ stories: Story[] }>("/stories");
    setStories(data.stories);
  }

  useEffect(() => { if (user) void load(); }, [user]);

  async function create(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("image", file);
    await api("/stories", { method: "POST", body });
    await load();
  }

  async function view(story: Story) {
    setActive(story);
    await api(`/stories/${story.id}/view`, { method: "POST" });
    setStories((items) => items.map((item) => item.id === story.id ? { ...item, viewed: true } : item));
  }

  function move(direction: number) {
    if (!active) return;
    const index = stories.findIndex((story) => story.id === active.id);
    const next = stories[index + direction];
    if (next) void view(next);
  }

  const cards = stories.slice(0, 3);
  return (
    <>
      <div className="_feed_inner_story _mar_b16"><div className="row">
        <div className="col-3"><div className="_feed_inner_profile_story _b_radious6"><div className="_feed_inner_profile_story_image">
          <img src={mediaUrl(user?.avatarUrl)} alt="" className="_profile_story_img" />
          <div className="_feed_inner_story_txt"><div className="_feed_inner_story_btn"><button className="_feed_inner_story_btn_link" onClick={() => input.current?.click()}>+</button></div><p className="_feed_inner_story_para">Your Story</p></div>
          <input ref={input} className="appify-file-input" type="file" accept="image/*" onChange={create} />
        </div></div></div>
        {cards.map((story) => <div className="col-3" key={story.id}><button className={`_feed_inner_public_story _b_radious6 appify-story ${story.viewed ? "viewed" : ""}`} onClick={() => view(story)}><div className="_feed_inner_public_story_image"><img src={mediaUrl(story.imageUrl)} alt="" className="_public_story_img" /><div className="_feed_inner_public_mini"><img src={mediaUrl(story.author.avatarUrl)} alt="" className="_public_mini_img" /></div><div className="_feed_inner_pulic_story_txt"><p className="_feed_inner_pulic_story_para"><span className="appify-link-button" onClick={(e) => { e.stopPropagation(); router.push(profilePath(story.author)); }}>{story.author.name}</span></p></div></div></button></div>)}
      </div></div>
      {active && <div className="appify-modal-backdrop" onClick={() => setActive(null)}><div className="appify-story-viewer" onClick={(event) => event.stopPropagation()}><button className="appify-story-nav previous" onClick={() => move(-1)} aria-label="Previous story">&lt;</button><img src={mediaUrl(active.imageUrl)} alt={`${active.author.name}'s story`} /><button className="appify-story-nav next" onClick={() => move(1)} aria-label="Next story">&gt;</button><p><button className="appify-link-button" onClick={() => router.push(profilePath(active.author))}>{active.author.name}</button></p></div></div>}
    </>
  );
}
