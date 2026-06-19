const { MongoClient } = require("mongodb");
const config = require("../config");

let client;
let database;
let connecting;

const collections = [
  "users",
  "user_profiles",
  "posts",
  "articles",
  "comments",
  "reactions",
  "saved_posts",
  "hidden_posts",
  "post_subscriptions",
  "comment_shares",
  "follows",
  "friend_requests",
  "ignored_suggestions",
  "stories",
  "story_views",
  "groups",
  "group_members",
  "events",
  "event_attendees",
  "event_reminders",
  "conversations",
  "conversation_members",
  "messages",
  "notifications",
];

async function ensureIndexes() {
  const db = database;
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ username: 1 }, { unique: true }),
    db.collection("users").createIndex({ google_subject: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("user_profiles").createIndex({ user_id: 1 }, { unique: true }),
    db.collection("posts").createIndex({ id: -1 }, { unique: true }),
    db.collection("comments").createIndex({ id: -1 }, { unique: true }),
    db.collection("reactions").createIndex({ user_id: 1, target_type: 1, target_id: 1 }, { unique: true }),
    db.collection("saved_posts").createIndex({ user_id: 1, post_id: 1 }, { unique: true }),
    db.collection("hidden_posts").createIndex({ user_id: 1, post_id: 1 }, { unique: true }),
    db.collection("post_subscriptions").createIndex({ user_id: 1, post_id: 1 }, { unique: true }),
    db.collection("comment_shares").createIndex({ shared_post_id: 1 }, { unique: true }),
    db.collection("follows").createIndex({ follower_id: 1, followed_id: 1 }, { unique: true }),
    db.collection("friend_requests").createIndex({ sender_id: 1, receiver_id: 1 }, { unique: true }),
    db.collection("ignored_suggestions").createIndex({ user_id: 1, ignored_user_id: 1 }, { unique: true }),
    db.collection("story_views").createIndex({ story_id: 1, viewer_id: 1 }, { unique: true }),
    db.collection("groups").createIndex({ id: 1 }, { unique: true }),
    db.collection("groups").createIndex({ slug: 1 }, { unique: true }),
    db.collection("group_members").createIndex({ group_id: 1, user_id: 1 }, { unique: true }),
    db.collection("events").createIndex({ id: 1 }, { unique: true }),
    db.collection("events").createIndex({ slug: 1 }, { unique: true }),
    db.collection("event_attendees").createIndex({ event_id: 1, user_id: 1 }, { unique: true }),
    db.collection("event_reminders").createIndex({ event_id: 1, user_id: 1 }, { unique: true }),
    db.collection("conversations").createIndex({ id: 1 }, { unique: true }),
    db.collection("conversation_members").createIndex({ conversation_id: 1, user_id: 1 }, { unique: true }),
    db.collection("messages").createIndex({ id: -1 }, { unique: true }),
    db.collection("notifications").createIndex({ id: -1 }, { unique: true }),
  ]);
}

async function connect() {
  if (database) return database;
  if (!connecting) {
    connecting = (async () => {
      if (config.isProduction && !config.mongoUri) {
        throw new Error("MONGODB_URI must be configured in production.");
      }
      client = new MongoClient(config.mongoUri);
      await client.connect();
      database = client.db(config.mongoDbName);
      await ensureIndexes();
      return database;
    })();
  }
  return connecting;
}

async function collection(name) {
  if (!collections.includes(name) && name !== "counters") {
    throw new Error(`Unknown collection: ${name}`);
  }
  const db = await connect();
  return db.collection(name);
}

async function nextId(name) {
  const counters = await collection("counters");
  const result = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result.seq;
}

function timestamp(date = new Date()) {
  return date.toISOString();
}

async function close() {
  if (client) await client.close();
  client = null;
  database = null;
  connecting = null;
}

async function reset() {
  const db = await connect();
  await Promise.all([...collections, "counters"].map((name) => db.collection(name).deleteMany({})));
}

module.exports = { close, collection, connect, nextId, reset, timestamp };
