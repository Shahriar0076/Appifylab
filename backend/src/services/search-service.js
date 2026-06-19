const db = require("../db");

function decodeCursor(value) {
  if (!value) return {};
  try {
    return JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

async function search(userId, query, limit = 10, cursorValue) {
  const term = String(query || "").trim();
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const safeLimit = Math.min(Number(limit) || 10, 30);
  const cursor = decodeCursor(cursorValue);
  const [users, profiles, posts, articles, groups, events] = await Promise.all([
    db.collection("users"),
    db.collection("user_profiles"),
    db.collection("posts"),
    db.collection("articles"),
    db.collection("groups"),
    db.collection("events"),
  ]);

  const userRows = await users.find({
    id: { $ne: userId, ...(cursor.users ? { $lt: cursor.users } : {}) },
    $or: [{ first_name: re }, { last_name: re }, { email: re }],
  }).sort({ id: -1 }).limit(safeLimit + 1).toArray();

  const articleMatches = await articles.find({ $or: [{ title: re }, { body: re }] }).toArray();
  const articlePostIds = articleMatches.map((row) => row.post_id);
  const postRows = await posts.find({
    group_id: null,
    is_deleted: false,
    id: { ...(cursor.posts ? { $lt: cursor.posts } : {}) },
    $or: [{ visibility: "public" }, { author_id: userId }],
    $and: [{ $or: [{ content: re }, { id: { $in: articlePostIds } }] }],
  }).sort({ id: -1 }).limit(safeLimit + 1).toArray();
  const groupRows = await groups.find({
    ...(cursor.groups ? { id: { $lt: cursor.groups } } : {}),
    name: re,
  }).sort({ id: -1 }).limit(safeLimit + 1).toArray();
  const eventRows = await events.find({
    ...(cursor.events ? { id: { $lt: cursor.events } } : {}),
    title: re,
  }).sort({ id: -1 }).limit(safeLimit + 1).toArray();

  const pages = [userRows, postRows, groupRows, eventRows].map((items) => items.slice(0, safeLimit));
  const hasMore = [userRows, postRows, groupRows, eventRows].some((items) => items.length > safeLimit);
  const next = {
    users: pages[0].at(-1)?.id || cursor.users || null,
    posts: pages[1].at(-1)?.id || cursor.posts || null,
    groups: pages[2].at(-1)?.id || cursor.groups || null,
    events: pages[3].at(-1)?.id || cursor.events || null,
  };
  return {
    users: await Promise.all(pages[0].map(async (row) => {
      const profile = await profiles.findOne({ user_id: row.id });
      return { id: row.id, username: row.username, name: `${row.first_name} ${row.last_name}`, avatarUrl: row.avatar_url, workplace: profile?.workplace };
    })),
    posts: await Promise.all(pages[1].map(async (row) => {
      const author = await users.findOne({ id: row.author_id });
      return { id: row.id, content: row.content, imageUrl: row.image_url, createdAt: row.created_at, author: { id: author.id, username: author.username, name: `${author.first_name} ${author.last_name}` } };
    })),
    groups: pages[2].map((row) => ({ id: row.id, slug: row.slug, name: row.name, description: row.description, imageUrl: row.image_url })),
    events: pages[3].map((row) => ({ id: row.id, slug: row.slug, title: row.title, description: row.description, imageUrl: row.image_url, startsAt: row.starts_at })),
    nextCursor: hasMore ? Buffer.from(JSON.stringify(next)).toString("base64url") : null,
  };
}

module.exports = { search };
