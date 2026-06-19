const db = require("../db");
const { broadcast } = require("../realtime");

const categoryByType = {
  friend_request: "friends",
  friend_response: "friends",
  follow: "friends",
  post_reaction: "reactions",
  comment_reaction: "reactions",
  comment: "comments",
  reply: "comments",
  post_activity: "comments",
  share: "shares",
  message: "messages",
  group_join: "groups",
  group_role: "groups",
  event_attendance: "events",
  event_invite: "events",
  event_reminder: "events",
};

async function isEnabled(userId, type) {
  const profiles = await db.collection("user_profiles");
  const row = await profiles.findOne({ user_id: userId });
  if (!row?.notification_preferences) return true;
  try {
    const preferences = JSON.parse(row.notification_preferences);
    if (preferences.push === false) return false;
    const category = categoryByType[type];
    return !category || preferences[category] !== false;
  } catch {
    return true;
  }
}

async function createNotification(userId, actorId, type, message, entityType = null, entityId = null) {
  if (!userId || userId === actorId || !(await isEnabled(userId, type))) return null;
  const notifications = await db.collection("notifications");
  const id = await db.nextId("notifications");
  await notifications.insertOne({
    id,
    user_id: userId,
    actor_id: actorId,
    type,
    message,
    entity_type: entityType,
    entity_id: entityId,
    is_read: false,
    created_at: db.timestamp(),
  });
  broadcast("notification:new", { userId, notificationId: id });
  return id;
}

async function list(userId, unreadOnly = false, limit = 30) {
  const notifications = await db.collection("notifications");
  const users = await db.collection("users");
  const rows = await notifications.find({
    user_id: userId,
    ...(unreadOnly ? { is_read: false } : {}),
  }).sort({ id: -1 }).limit(Math.min(Number(limit) || 30, 100)).toArray();
  return Promise.all(rows.map(async (row) => {
    const actor = row.actor_id ? await users.findOne({ id: row.actor_id }) : null;
    return {
      id: row.id,
      type: row.type,
      message: row.message,
      entityType: row.entity_type,
      entityId: row.entity_id,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
      actor: actor ? {
        id: actor.id,
        username: actor.username,
        name: `${actor.first_name} ${actor.last_name}`,
        avatarUrl: actor.avatar_url,
      } : null,
    };
  }));
}

async function unreadCount(userId) {
  const notifications = await db.collection("notifications");
  return notifications.countDocuments({ user_id: userId, is_read: false });
}

async function markRead(userId, notificationId) {
  const notifications = await db.collection("notifications");
  await notifications.updateOne({ id: notificationId, user_id: userId }, { $set: { is_read: true } });
}

async function markAllRead(userId) {
  const notifications = await db.collection("notifications");
  await notifications.updateMany({ user_id: userId }, { $set: { is_read: true } });
}

module.exports = { createNotification, list, unreadCount, markRead, markAllRead };
