export type PublicUserRef = { id: number; username?: string | null };
export type PublicGroupRef = { id: number; slug?: string | null };
export type PublicEventRef = { id: number; slug?: string | null };

export function profilePath(user: PublicUserRef) {
  return `/profile/${encodeURIComponent(user.username || String(user.id))}`;
}

export function groupPath(group: PublicGroupRef) {
  return `/groups/${encodeURIComponent(group.slug || String(group.id))}`;
}

export function eventPath(event: PublicEventRef) {
  return `/events/${encodeURIComponent(event.slug || String(event.id))}`;
}
