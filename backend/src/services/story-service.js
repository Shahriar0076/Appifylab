const db = require("../db");
const HttpError = require("../utils/http-error");

async function list(userId) {
  const stories = await db.collection("stories");
  const views = await db.collection("story_views");
  const users = await db.collection("users");
  const rows = await stories.find({ expires_at: { $gt: new Date().toISOString() } }).sort({ id: -1 }).toArray();
  return Promise.all(rows.map(async (row) => {
    const user = await users.findOne({ id: row.author_id });
    return {
      id: row.id, imageUrl: row.image_url, createdAt: row.created_at, expiresAt: row.expires_at,
      viewed: Boolean(await views.findOne({ story_id: row.id, viewer_id: userId })),
      isOwner: row.author_id === userId,
      author: { id: row.author_id, username: user.username, name: `${user.first_name} ${user.last_name}`, avatarUrl: user.avatar_url },
    };
  }));
}

async function create(userId, file) {
  if (!file) throw new HttpError(400, "Select an image for the story.");
  const stories = await db.collection("stories");
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const id = await db.nextId("stories");
  await stories.insertOne({ id, author_id: userId, image_url: file.path, created_at: now.toISOString(), expires_at: expires.toISOString() });
  return id;
}

async function view(storyId, userId) {
  const stories = await db.collection("stories");
  const story = await stories.findOne({ id: storyId, expires_at: { $gt: new Date().toISOString() } });
  if (!story) throw new HttpError(404, "Story was not found or has expired.");
  const views = await db.collection("story_views");
  await views.updateOne({ story_id: storyId, viewer_id: userId }, { $setOnInsert: { story_id: storyId, viewer_id: userId, created_at: db.timestamp() } }, { upsert: true });
}

module.exports = { list, create, view };
