"use client";

import { useRouter } from "next/navigation";
import { mediaUrl } from "@/lib/api";
import type { ReactionSummary } from "@/lib/types";
import { profilePath } from "@/lib/routes";

export function LikerModal({ reactions, onClose }: { reactions: ReactionSummary; onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="appify-modal-backdrop" onClick={onClose}>
      <div className="appify-modal" onClick={(event) => event.stopPropagation()}>
        <div className="appify-modal-header"><h4>Reactions</h4><button onClick={onClose}>×</button></div>
        {reactions.users.length ? reactions.users.map((user) => <div className="appify-liker-row" key={user.id}>
          <img src={mediaUrl(user.avatarUrl)} alt="" /><div><strong><button className="appify-link-button" onClick={() => router.push(profilePath(user))}>{user.name}</button></strong><div>{user.reactionType}</div></div>
        </div>) : <p>No reactions yet.</p>}
      </div>
    </div>
  );
}
