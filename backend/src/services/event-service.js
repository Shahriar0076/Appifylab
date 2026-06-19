const { z } = require("zod");
const db = require("../db");
const HttpError = require("../utils/http-error");
const notifications = require("./notification-service");
const { createEventSlug } = require("../utils/slugs");

async function resolveEvent(identifier) {
  const events = await db.collection("events");
  const value = String(identifier);
  const row = /^\d+$/.test(value)
    ? await events.findOne({ id: Number(value) })
    : await events.findOne({ slug: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (!row) throw new HttpError(404, "Event was not found.");
  return row;
}

async function serialize(row, userId) {
  const attendees = await db.collection("event_attendees");
  const attendance = await attendees.findOne({ event_id: row.id, user_id: userId });
  return {
    id: row.id, slug: row.slug, title: row.title, description: row.description, imageUrl: row.image_url,
    location: row.location, startsAt: row.starts_at, creatorId: row.creator_id,
    attendeeCount: await attendees.countDocuments({ event_id: row.id, status: "going" }),
    attendance: attendance?.status || null,
  };
}

async function list(userId, query = "") {
  const events = await db.collection("events");
  const rows = await events.find({ title: new RegExp(String(query || ""), "i") }).sort({ starts_at: 1, id: -1 }).limit(50).toArray();
  return Promise.all(rows.map((row) => serialize(row, userId)));
}

async function create(userId, input, file) {
  const data = z.object({
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().max(2000).default(""),
    location: z.string().trim().max(150).default(""),
    startsAt: z.string().min(1),
  }).parse(input);
  const events = await db.collection("events");
  const now = db.timestamp();
  const id = await db.nextId("events");
  await events.insertOne({
    id,
    creator_id: userId,
    title: data.title,
    slug: await createEventSlug(db, data.title),
    description: data.description,
    image_url: file?.path || null,
    location: data.location,
    starts_at: data.startsAt,
    created_at: now,
    updated_at: now,
  });
  return id;
}

async function details(identifier, userId) {
  const row = await resolveEvent(identifier);
  const event = await serialize(row, userId);
  const attendees = await db.collection("event_attendees");
  const users = await db.collection("users");
  const attendeeRows = await attendees.find({ event_id: row.id }).toArray();
  event.attendees = await Promise.all(attendeeRows.map(async (attendee) => {
    const user = await users.findOne({ id: attendee.user_id });
    return { id: user.id, username: user.username, name: `${user.first_name} ${user.last_name}`, avatarUrl: user.avatar_url, status: attendee.status };
  }));
  return event;
}

async function attend(identifier, userId, status) {
  const event = await resolveEvent(identifier);
  if (!["going", "not_going"].includes(status)) throw new HttpError(400, "Invalid attendance status.");
  const attendees = await db.collection("event_attendees");
  await attendees.updateOne(
    { event_id: event.id, user_id: userId },
    { $set: { status, updated_at: db.timestamp() }, $setOnInsert: { event_id: event.id, user_id: userId, created_at: db.timestamp() } },
    { upsert: true },
  );
  if (status === "going") await notifications.createNotification(event.creator_id, userId, "event_attendance", "is going to your event.", "event", event.id);
}

async function invite(identifier, userId, targetId) {
  const event = await resolveEvent(identifier);
  const attendees = await db.collection("event_attendees");
  await attendees.updateOne(
    { event_id: event.id, user_id: targetId },
    { $set: { status: "invited", updated_at: db.timestamp() }, $setOnInsert: { event_id: event.id, user_id: targetId, created_at: db.timestamp() } },
    { upsert: true },
  );
  await notifications.createNotification(targetId, userId, "event_invite", "invited you to an event.", "event", event.id);
}

async function sendDueReminders() {
  const [events, attendees, reminders] = await Promise.all([
    db.collection("events"),
    db.collection("event_attendees"),
    db.collection("event_reminders"),
  ]);
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dueEvents = await events.find({ starts_at: { $gt: now.toISOString(), $lte: soon.toISOString() } }).toArray();
  for (const event of dueEvents) {
    const rows = await attendees.find({ event_id: event.id, status: { $in: ["going", "invited"] } }).toArray();
    for (const attendee of rows) {
      const existing = await reminders.findOne({ event_id: event.id, user_id: attendee.user_id });
      if (!existing) {
        await notifications.createNotification(attendee.user_id, null, "event_reminder", `Reminder: ${event.title} starts within 24 hours.`, "event", event.id);
        await reminders.insertOne({ event_id: event.id, user_id: attendee.user_id, created_at: db.timestamp() });
      }
    }
  }
}

module.exports = { list, create, details, attend, invite, sendDueReminders, resolveEvent };
