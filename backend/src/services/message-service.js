const { z } = require("zod");
const db = require("../db");
const HttpError = require("../utils/http-error");
const notifications = require("./notification-service");
const { broadcast } = require("../realtime");

async function assertMember(conversationId, userId) {
  const members = await db.collection("conversation_members");
  const member = await members.findOne({ conversation_id: conversationId, user_id: userId });
  if (!member) throw new HttpError(403, "You are not a member of this conversation.");
}

async function getOrCreate(userId, targetId) {
  if (userId === targetId) throw new HttpError(400, "Select another user.");
  const members = await db.collection("conversation_members");
  const mine = await members.find({ user_id: userId }).toArray();
  for (const row of mine) {
    const conversationMembers = await members.find({ conversation_id: row.conversation_id }).toArray();
    if (conversationMembers.length === 2 && conversationMembers.some((member) => member.user_id === targetId)) {
      return row.conversation_id;
    }
  }
  const conversations = await db.collection("conversations");
  const now = db.timestamp();
  const id = await db.nextId("conversations");
  await conversations.insertOne({ id, created_at: now, updated_at: now });
  await members.insertMany([
    { conversation_id: id, user_id: userId, last_read_at: null, created_at: now },
    { conversation_id: id, user_id: targetId, last_read_at: null, created_at: now },
  ]);
  return id;
}

async function list(userId) {
  const [conversations, members, messages, users] = await Promise.all([
    db.collection("conversations"),
    db.collection("conversation_members"),
    db.collection("messages"),
    db.collection("users"),
  ]);
  const mine = await members.find({ user_id: userId }).toArray();
  const rows = [];
  for (const member of mine) {
    const conversation = await conversations.findOne({ id: member.conversation_id });
    const otherMember = await members.findOne({ conversation_id: member.conversation_id, user_id: { $ne: userId } });
    if (!conversation || !otherMember) continue;
    const [otherUser, lastMessage, unread] = await Promise.all([
      users.findOne({ id: otherMember.user_id }),
      messages.find({ conversation_id: conversation.id }).sort({ id: -1 }).limit(1).next(),
      messages.countDocuments({ conversation_id: conversation.id, sender_id: { $ne: userId }, read_at: null }),
    ]);
    rows.push({
      id: conversation.id,
      updatedAt: conversation.updated_at,
      lastMessage: lastMessage?.content || null,
      unreadCount: unread,
      otherUser: { id: otherUser.id, username: otherUser.username, name: `${otherUser.first_name} ${otherUser.last_name}`, avatarUrl: otherUser.avatar_url },
    });
  }
  return rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

async function messages(conversationId, userId, before = null) {
  await assertMember(conversationId, userId);
  const [messagesCollection, members, users] = await Promise.all([
    db.collection("messages"),
    db.collection("conversation_members"),
    db.collection("users"),
  ]);
  const now = db.timestamp();
  await messagesCollection.updateMany({ conversation_id: conversationId, sender_id: { $ne: userId }, read_at: null }, { $set: { read_at: now } });
  await members.updateOne({ conversation_id: conversationId, user_id: userId }, { $set: { last_read_at: now } });
  const rows = await messagesCollection.find({
    conversation_id: conversationId,
    ...(before ? { id: { $lt: Number(before) } } : {}),
  }).sort({ id: -1 }).limit(50).toArray();
  const ordered = rows.reverse();
  return Promise.all(ordered.map(async (row) => {
    const user = await users.findOne({ id: row.sender_id });
    return {
      id: row.id, content: row.content, attachmentUrl: row.attachment_url, attachmentName: row.attachment_name,
      createdAt: row.created_at, deliveredAt: row.delivered_at, readAt: row.read_at,
      sender: { id: row.sender_id, username: user.username, name: `${user.first_name} ${user.last_name}`, avatarUrl: user.avatar_url },
    };
  }));
}

async function send(conversationId, userId, input, file) {
  await assertMember(conversationId, userId);
  const content = z.string().trim().max(5000).default("").parse(input.content);
  if (!content && !file) throw new HttpError(400, "Message cannot be empty.");
  const messagesCollection = await db.collection("messages");
  const conversations = await db.collection("conversations");
  const members = await db.collection("conversation_members");
  const now = db.timestamp();
  const id = await db.nextId("messages");
  await messagesCollection.insertOne({
    id,
    conversation_id: conversationId,
    sender_id: userId,
    content,
    attachment_url: file?.path || null,
    attachment_name: file?.originalname || null,
    delivered_at: now,
    read_at: null,
    created_at: now,
  });
  await conversations.updateOne({ id: conversationId }, { $set: { updated_at: now } });
  const recipients = await members.find({ conversation_id: conversationId, user_id: { $ne: userId } }).toArray();
  await Promise.all(recipients.map(({ user_id }) => notifications.createNotification(user_id, userId, "message", "sent you a message.", "conversation", conversationId)));
  broadcast("message:new", { conversationId, messageId: id, recipients: recipients.map((item) => item.user_id) });
  return id;
}

module.exports = { getOrCreate, list, messages, send, assertMember };
