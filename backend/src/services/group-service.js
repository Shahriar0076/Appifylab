const { z } = require("zod");
const db = require("../db");
const HttpError = require("../utils/http-error");
const notifications = require("./notification-service");
const postService = require("./post-service");
const { createGroupSlug } = require("../utils/slugs");

async function resolveGroup(identifier) {
  const groups = await db.collection("groups");
  const value = String(identifier);
  const row = /^\d+$/.test(value)
    ? await groups.findOne({ id: Number(value) })
    : await groups.findOne({ slug: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (!row) throw new HttpError(404, "Group was not found.");
  return row;
}

async function serialize(row, userId) {
  const members = await db.collection("group_members");
  const membership = await members.findOne({ group_id: row.id, user_id: userId });
  return {
    id: row.id, slug: row.slug, name: row.name, description: row.description, imageUrl: row.image_url,
    privacy: row.privacy, createdAt: row.created_at, ownerId: row.owner_id,
    memberCount: await members.countDocuments({ group_id: row.id }),
    membership: membership?.role || null,
  };
}

function pageOptions(cursor, limit, fallbackLimit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || fallbackLimit, 1), 50);
  const offset = Math.max(Number(cursor) || 0, 0);
  return { safeLimit, offset };
}

async function list(userId, query = "", cursor = null, limit = 50) {
  const groups = await db.collection("groups");
  const { safeLimit, offset } = pageOptions(cursor, limit);
  const filter = { name: new RegExp(String(query || ""), "i") };
  const rows = await groups.find(filter).sort({ id: -1 }).skip(offset).limit(safeLimit + 1).toArray();
  const page = rows.slice(0, safeLimit);
  return {
    items: await Promise.all(page.map((row) => serialize(row, userId))),
    nextCursor: rows.length > safeLimit ? offset + safeLimit : null,
  };
}

async function create(userId, input, file) {
  const data = z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1000).default(""),
    privacy: z.enum(["public", "private"]).default("public"),
  }).parse(input);
  const groups = await db.collection("groups");
  const members = await db.collection("group_members");
  const now = db.timestamp();
  const id = await db.nextId("groups");
  await groups.insertOne({
    id,
    owner_id: userId,
    slug: await createGroupSlug(db, data.name),
    name: data.name,
    description: data.description,
    image_url: file?.path || null,
    privacy: data.privacy,
    created_at: now,
    updated_at: now,
  });
  await members.insertOne({ group_id: id, user_id: userId, role: "admin", created_at: now });
  return id;
}

async function details(identifier, userId, postCursor = null, postLimit = 50) {
  const pagedPosts = arguments.length >= 4;
  const row = await resolveGroup(identifier);
  const groupId = row.id;
  const members = await db.collection("group_members");
  const membership = await members.findOne({ group_id: groupId, user_id: userId });
  if (row.privacy !== "public" && !membership) throw new HttpError(404, "Group was not found.");
  const group = await serialize(row, userId);
  const users = await db.collection("users");
  const memberRows = await members.find({ group_id: groupId }).toArray();
  group.members = await Promise.all(memberRows.map(async (member) => {
    const user = await users.findOne({ id: member.user_id });
    return { id: user.id, username: user.username, name: `${user.first_name} ${user.last_name}`, avatarUrl: user.avatar_url, role: member.role };
  }));
  const posts = await postService.listGroupPosts(groupId, userId, postCursor, postLimit);
  group.posts = posts.items;
  group.postsNextCursor = posts.nextCursor;
  if (!pagedPosts) {
    group.posts = await postService.listGroupPosts(groupId, userId);
    group.postsNextCursor = null;
  }
  return group;
}

async function toggleMembership(identifier, userId) {
  const group = await resolveGroup(identifier);
  const members = await db.collection("group_members");
  const member = await members.findOne({ group_id: group.id, user_id: userId });
  if (member) {
    if (member.role === "admin") throw new HttpError(400, "The group administrator cannot leave the group.");
    await members.deleteOne({ _id: member._id });
  } else {
    await members.insertOne({ group_id: group.id, user_id: userId, role: "member", created_at: db.timestamp() });
    await notifications.createNotification(group.owner_id, userId, "group_join", "joined your group.", "group", group.id);
  }
  return !member;
}

async function createPost(identifier, userId, input, file) {
  const groupId = (await resolveGroup(identifier)).id;
  return postService.createPost(userId, input, file, { groupId });
}

async function update(identifier, userId, input) {
  const groupId = (await resolveGroup(identifier)).id;
  const members = await db.collection("group_members");
  const membership = await members.findOne({ group_id: groupId, user_id: userId });
  if (!membership || !["admin", "moderator"].includes(membership.role)) throw new HttpError(403, "Only group administrators can update this group.");
  const data = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(1000) }).parse(input);
  const groups = await db.collection("groups");
  await groups.updateOne({ id: groupId }, { $set: { name: data.name, description: data.description, updated_at: db.timestamp() } });
}

async function setRole(identifier, userId, targetId, role) {
  const groupId = (await resolveGroup(identifier)).id;
  if (!["member", "moderator"].includes(role)) throw new HttpError(400, "Invalid group role.");
  const members = await db.collection("group_members");
  const actor = await members.findOne({ group_id: groupId, user_id: userId });
  if (actor?.role !== "admin") throw new HttpError(403, "Only group administrators can manage roles.");
  const result = await members.updateOne({ group_id: groupId, user_id: targetId, role: { $ne: "admin" } }, { $set: { role, updated_at: db.timestamp() } });
  if (!result.modifiedCount) throw new HttpError(404, "Group member was not found.");
  await notifications.createNotification(targetId, userId, "group_role", `changed your group role to ${role}.`, "group", groupId);
}

module.exports = { list, create, details, toggleMembership, createPost, update, setRole, resolveGroup };
