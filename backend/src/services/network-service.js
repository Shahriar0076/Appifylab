const db = require("../db");
const HttpError = require("../utils/http-error");
const notifications = require("./notification-service");
const { emitToUser } = require("../realtime");

function emitNetworkChange(userId, targetId, type) {
  emitToUser(userId, "network:changed", { otherUserId: targetId, type });
  emitToUser(targetId, "network:changed", { otherUserId: userId, type });
}

function userCard(user, profile = {}, extras = {}) {
  return {
    id: user.id,
    username: user.username,
    name: `${user.first_name} ${user.last_name}`,
    avatarUrl: user.avatar_url,
    workplace: profile?.workplace,
    coverUrl: profile?.cover_url,
    ...extras,
  };
}

async function acceptedFriendIds(userId) {
  const requests = await db.collection("friend_requests");
  const rows = await requests.find({
    status: "accepted",
    $or: [{ sender_id: userId }, { receiver_id: userId }],
  }).toArray();
  return rows.map((row) => (row.sender_id === userId ? row.receiver_id : row.sender_id));
}

function pageOptions(cursor, limit, fallbackLimit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || fallbackLimit, 1), 50);
  const offset = Math.max(Number(cursor) || 0, 0);
  return { safeLimit, offset };
}

async function people(userId, query = "", limit = 20, cursor = null) {
  const paged = arguments.length >= 4;
  const users = await db.collection("users");
  const profiles = await db.collection("user_profiles");
  const follows = await db.collection("follows");
  const ignored = await db.collection("ignored_suggestions");
  const requests = await db.collection("friend_requests");
  const search = String(query || "").trim();
  const { safeLimit, offset } = pageOptions(cursor, limit);
  const ignoredIds = (await ignored.find({ user_id: userId }).toArray()).map((row) => row.ignored_user_id);
  const friendIds = await acceptedFriendIds(userId);
  const rows = await users.find({
    id: { $nin: [userId, ...ignoredIds, ...friendIds] },
    ...(search ? { $or: [
      { first_name: new RegExp(search, "i") },
      { last_name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
    ] } : {}),
  }).sort({ id: -1 }).skip(offset).limit(safeLimit + 1).toArray();
  const page = rows.slice(0, safeLimit);
  const items = await Promise.all(page.map(async (user) => {
    const [profile, following, outgoing] = await Promise.all([
      profiles.findOne({ user_id: user.id }),
      follows.findOne({ follower_id: userId, followed_id: user.id }),
      requests.findOne({ sender_id: userId, receiver_id: user.id, status: "pending" }),
    ]);
    return userCard(user, profile, {
      isFollowing: Boolean(following),
      friendStatus: outgoing ? "requested" : "connect",
    });
  }));
  return paged ? { items, nextCursor: rows.length > safeLimit ? offset + safeLimit : null } : items;
}

async function toggleFollow(userId, targetId) {
  if (userId === targetId) throw new HttpError(400, "You cannot follow yourself.");
  const follows = await db.collection("follows");
  const existing = await follows.findOne({ follower_id: userId, followed_id: targetId });
  if (existing) {
    await follows.deleteOne({ _id: existing._id });
  } else {
    await follows.insertOne({ follower_id: userId, followed_id: targetId, created_at: db.timestamp() });
    await notifications.createNotification(targetId, userId, "follow", "started following you.", "user", userId);
  }
  emitNetworkChange(userId, targetId, "follow");
  return !existing;
}

async function sendRequest(userId, targetId) {
  if (userId === targetId) throw new HttpError(400, "You cannot connect with yourself.");
  const requests = await db.collection("friend_requests");
  const reverse = await requests.findOne({ sender_id: targetId, receiver_id: userId });
  if (reverse?.status === "accepted") throw new HttpError(409, "You are already friends.");
  if (reverse?.status === "pending") {
    await respond(userId, reverse.id, "accepted");
    return "friend";
  }
  const existing = await requests.findOne({ sender_id: userId, receiver_id: targetId });
  const now = db.timestamp();
  if (existing) {
    await requests.updateOne({ _id: existing._id }, { $set: { status: "pending", updated_at: now } });
  } else {
    await requests.insertOne({ id: await db.nextId("friend_requests"), sender_id: userId, receiver_id: targetId, status: "pending", created_at: now, updated_at: now });
  }
  await notifications.createNotification(targetId, userId, "friend_request", "sent you a friend request.", "user", userId);
  emitNetworkChange(userId, targetId, "friend_request");
  return "requested";
}

async function requests(userId, cursor = null, limit = 50) {
  const paged = arguments.length >= 2;
  const requestCollection = await db.collection("friend_requests");
  const users = await db.collection("users");
  const profiles = await db.collection("user_profiles");
  const { safeLimit, offset } = pageOptions(cursor, limit, 50);
  const rows = await requestCollection.find({ receiver_id: userId, status: "pending" }).sort({ id: -1 }).skip(offset).limit(safeLimit + 1).toArray();
  const page = rows.slice(0, safeLimit);
  const items = await Promise.all(page.map(async (row) => {
    const user = await users.findOne({ id: row.sender_id });
    const profile = await profiles.findOne({ user_id: row.sender_id });
    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      user: userCard(user, profile),
    };
  }));
  return paged ? { items, nextCursor: rows.length > safeLimit ? offset + safeLimit : null } : items;
}

async function respond(userId, requestId, status) {
  if (!["accepted", "rejected"].includes(status)) throw new HttpError(400, "Invalid friend request response.");
  const requests = await db.collection("friend_requests");
  const request = await requests.findOne({ id: requestId, receiver_id: userId, status: "pending" });
  if (!request) throw new HttpError(404, "Friend request was not found.");
  await requests.updateOne({ _id: request._id }, { $set: { status, updated_at: db.timestamp() } });
  await notifications.createNotification(request.sender_id, userId, "friend_response", `${status} your friend request.`, "user", userId);
  emitNetworkChange(userId, request.sender_id, status === "accepted" ? "friend_accepted" : "friend_rejected");
}

async function friends(userId, query = "", cursor = null, limit = 50) {
  const paged = arguments.length >= 3;
  const users = await db.collection("users");
  const profiles = await db.collection("user_profiles");
  const friendIds = await acceptedFriendIds(userId);
  const search = String(query || "").trim();
  const { safeLimit, offset } = pageOptions(cursor, limit, 50);
  const rows = await users.find({
    id: { $in: friendIds },
    ...(search ? { $or: [{ first_name: new RegExp(search, "i") }, { last_name: new RegExp(search, "i") }] } : {}),
  }).sort({ first_name: 1, id: 1 }).skip(offset).limit(safeLimit + 1).toArray();
  const page = rows.slice(0, safeLimit);
  const result = {
    items: await Promise.all(page.map(async (user) => userCard(user, await profiles.findOne({ user_id: user.id })))),
    nextCursor: rows.length > safeLimit ? offset + safeLimit : null,
  };
  return paged ? result : result.items;
}

async function removeFriend(userId, targetId) {
  const requests = await db.collection("friend_requests");
  const result = await requests.deleteOne({
    status: "accepted",
    $or: [
      { sender_id: userId, receiver_id: targetId },
      { sender_id: targetId, receiver_id: userId },
    ],
  });
  if (!result.deletedCount) throw new HttpError(404, "Friendship was not found.");
  emitNetworkChange(userId, targetId, "friend_removed");
}

async function ignore(userId, targetId) {
  const ignored = await db.collection("ignored_suggestions");
  await ignored.updateOne(
    { user_id: userId, ignored_user_id: targetId },
    { $setOnInsert: { user_id: userId, ignored_user_id: targetId, created_at: db.timestamp() } },
    { upsert: true },
  );
}

module.exports = { people, toggleFollow, sendRequest, requests, respond, friends, removeFriend, ignore, acceptedFriendIds };
