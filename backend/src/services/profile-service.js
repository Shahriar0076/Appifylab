const { z } = require("zod");
const db = require("../db");
const HttpError = require("../utils/http-error");
const { createProfile } = require("./auth-service");
const networkService = require("./network-service");

async function friendStatus(viewerId, userId) {
  const requests = await db.collection("friend_requests");
  const relationship = await requests.findOne({
    $or: [
      { sender_id: viewerId, receiver_id: userId },
      { sender_id: userId, receiver_id: viewerId },
    ],
  }, { sort: { status: 1, id: -1 } });
  if (relationship?.status === "accepted") return "friend";
  if (relationship?.status === "pending" && relationship.sender_id === viewerId) return "requested";
  return "connect";
}

async function resolveUser(identifier) {
  const users = await db.collection("users");
  const value = String(identifier);
  const row = /^\d+$/.test(value)
    ? await users.findOne({ id: Number(value) })
    : await users.findOne({ username: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (!row) throw new HttpError(404, "User was not found.");
  return { id: row.id, username: row.username };
}

function parsePreferences(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

async function countsFor(userId) {
  const [follows, requests, members, attendees] = await Promise.all([
    db.collection("follows"),
    db.collection("friend_requests"),
    db.collection("group_members"),
    db.collection("event_attendees"),
  ]);
  const [followers, following, friends, groupsJoined, eventsAttended] = await Promise.all([
    follows.countDocuments({ followed_id: userId }),
    follows.countDocuments({ follower_id: userId }),
    requests.countDocuments({ status: "accepted", $or: [{ sender_id: userId }, { receiver_id: userId }] }),
    members.countDocuments({ user_id: userId }),
    attendees.countDocuments({ user_id: userId, status: "going" }),
  ]);
  return { followers, following, friends, groupsJoined, eventsAttended };
}

async function userView(row, profile, viewerId) {
  const follows = await db.collection("follows");
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    email: row.id === viewerId ? row.email : undefined,
    avatarUrl: row.avatar_url,
    coverUrl: profile?.cover_url,
    bio: profile?.bio,
    location: profile?.location,
    workplace: profile?.workplace,
    privacy: profile?.privacy || "public",
    notificationPreferences: row.id === viewerId ? parsePreferences(profile?.notification_preferences) : undefined,
    counts: await countsFor(row.id),
    isFollowing: Boolean(await follows.findOne({ follower_id: viewerId, followed_id: row.id })),
    friendStatus: viewerId === row.id ? undefined : await friendStatus(viewerId, row.id),
    isOwner: viewerId === row.id,
  };
}

async function get(identifier, viewerId) {
  const resolved = await resolveUser(identifier);
  const users = await db.collection("users");
  const profiles = await db.collection("user_profiles");
  const row = await users.findOne({ id: resolved.id });
  const profile = await profiles.findOne({ user_id: resolved.id });
  if (!row) throw new HttpError(404, "User was not found.");
  const status = await friendStatus(viewerId, row.id);
  const privacy = profile?.privacy || "public";
  if (row.id !== viewerId && (privacy === "private" || (privacy === "friends" && status !== "friend"))) {
    const follows = await db.collection("follows");
    return {
      id: row.id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      name: `${row.first_name} ${row.last_name}`,
      avatarUrl: row.avatar_url,
      coverUrl: profile?.cover_url,
      privacy,
      isPrivate: true,
      isOwner: false,
      isFollowing: Boolean(await follows.findOne({ follower_id: viewerId, followed_id: row.id })),
      friendStatus: status,
      counts: { followers: 0, following: 0, friends: 0 },
    };
  }
  return userView(row, profile, viewerId);
}

function fileUrl(file) {
  return file?.path || null;
}

async function update(userId, input, files = {}) {
  const data = z.object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    bio: z.string().trim().max(500).optional(),
    location: z.string().trim().max(100).optional(),
    workplace: z.string().trim().max(100).optional(),
    privacy: z.enum(["public", "friends", "private"]).optional(),
    notificationPreferences: z.string().max(2000).optional(),
  }).parse(input);
  if (data.notificationPreferences) {
    let rawPreferences;
    try {
      rawPreferences = JSON.parse(data.notificationPreferences);
    } catch {
      throw new HttpError(400, "Notification preferences must be valid JSON.");
    }
    const preferences = z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      friends: z.boolean().optional(),
      reactions: z.boolean().optional(),
      comments: z.boolean().optional(),
      shares: z.boolean().optional(),
      messages: z.boolean().optional(),
      groups: z.boolean().optional(),
      events: z.boolean().optional(),
    }).strict().parse(rawPreferences);
    data.notificationPreferences = JSON.stringify(preferences);
  }
  const users = await db.collection("users");
  const profiles = await db.collection("user_profiles");
  const user = await users.findOne({ id: userId });
  if (!user) throw new HttpError(404, "User was not found.");
  await users.updateOne({ id: userId }, {
    $set: {
      first_name: data.firstName ?? user.first_name,
      last_name: data.lastName ?? user.last_name,
      avatar_url: fileUrl(files.avatar?.[0]) || user.avatar_url,
      updated_at: db.timestamp(),
    },
  });
  await createProfile(userId);
  const profile = await profiles.findOne({ user_id: userId });
  await profiles.updateOne({ user_id: userId }, {
    $set: {
      bio: data.bio ?? profile?.bio,
      cover_url: fileUrl(files.cover?.[0]) || profile?.cover_url,
      location: data.location ?? profile?.location,
      workplace: data.workplace ?? profile?.workplace,
      privacy: data.privacy ?? profile?.privacy ?? "public",
      notification_preferences: data.notificationPreferences ?? profile?.notification_preferences,
      updated_at: db.timestamp(),
    },
  });
  return get(userId, userId);
}

async function posts(identifier, viewerId) {
  const userId = (await resolveUser(identifier)).id;
  const profile = await get(userId, viewerId);
  if (profile.isPrivate) return [];
  const postService = require("./post-service");
  return postService.listUserPosts(userId, viewerId);
}

module.exports = { get, update, posts, resolveUser, friendStatus, countsFor };
