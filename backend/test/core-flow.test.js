const assert = require("node:assert/strict");
const test = require("node:test");

process.env.JWT_SECRET = "test-secret";
process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || `appify_test_${Date.now()}`;

const db = require("../src/db");
const authService = require("../src/services/auth-service");
const postService = require("../src/services/post-service");
const profileService = require("../src/services/profile-service");
const networkService = require("../src/services/network-service");
const notificationService = require("../src/services/notification-service");
const groupService = require("../src/services/group-service");
const eventService = require("../src/services/event-service");
const messageService = require("../src/services/message-service");
const searchService = require("../src/services/search-service");
const app = require("../src/app");

let mongoAvailable = process.env.RUN_MONGO_TESTS === "1" || String(process.env.MONGODB_URI || "").startsWith("mongodb+srv://");

test.before(async () => {
  if (!mongoAvailable) return;
  try {
    await db.reset();
  } catch (error) {
    if (error.name !== "MongoServerSelectionError") throw error;
    mongoAvailable = false;
  }
});

test.after(async () => {
  if (mongoAvailable) await db.reset();
  await db.close();
});

async function userByEmail(email) {
  const users = await db.collection("users");
  return users.findOne({ email });
}

test("core social flow works with MongoDB storage", async (t) => {
  if (!mongoAvailable) return t.skip("Set MONGODB_URI to an Atlas URI or RUN_MONGO_TESTS=1 to run MongoDB integration tests.");
  const first = (await authService.register({
    firstName: "First",
    lastName: "User",
    email: "first@example.com",
    password: "SecurePass123!",
    confirmPassword: "SecurePass123!",
    acceptedTerms: true,
  })).user;
  const second = (await authService.register({
    firstName: "Second",
    lastName: "User",
    email: "second@example.com",
    password: "SecurePass123!",
    confirmPassword: "SecurePass123!",
    acceptedTerms: true,
  })).user;

  const publicPost = await postService.createPost(first.id, { content: "Public", visibility: "public" });
  await postService.createPost(first.id, { content: "Private", visibility: "private" });
  const secondFeed = await postService.listPosts(second.id);
  assert.equal(secondFeed.items.length, 1);
  assert.equal(secondFeed.items[0].content, "Public");

  const commentId = await postService.addComment(publicPost.id, second.id, { content: "Comment" });
  await postService.addComment(publicPost.id, first.id, { content: "Reply", parentId: commentId });
  const reactions = await postService.toggleReaction("post", publicPost.id, second.id, "love");
  assert.equal(reactions.currentUserReaction, "love");
  assert.equal(reactions.count, 1);

  const updated = await profileService.update(first.id, { bio: "Builder", workplace: "Appify" });
  assert.equal(updated.bio, "Builder");
  assert.equal((await profileService.get(updated.username, second.id)).id, first.id);

  assert.equal(await networkService.toggleFollow(second.id, first.id), true);
  assert.equal(await networkService.sendRequest(second.id, first.id), "requested");
  const request = (await networkService.requests(first.id))[0];
  await networkService.respond(first.id, request.id, "accepted");
  assert.equal((await networkService.friends(first.id)).length, 1);

  const groupId = await groupService.create(first.id, { name: "Builders", description: "Build together", privacy: "public" });
  await groupService.toggleMembership(groupId, second.id);
  await groupService.createPost(groupId, second.id, { content: "Hello group" });
  const groupPost = (await groupService.details(groupId, first.id)).posts[0];
  assert.equal(groupPost.content, "Hello group");
  assert.equal(await postService.toggleSaved(groupPost.id, first.id), true);
  assert.equal((await postService.listSaved(first.id)).some((post) => post.id === groupPost.id), true);

  const eventId = await eventService.create(first.id, {
    title: "Launch",
    description: "Product launch",
    location: "Dhaka",
    startsAt: "2030-01-01T10:00:00.000Z",
  });
  await eventService.attend(eventId, second.id, "going");
  assert.equal((await eventService.details(eventId, first.id)).attendees.length, 1);

  const conversationId = await messageService.getOrCreate(first.id, second.id);
  await messageService.send(conversationId, first.id, { content: "Hello" });
  assert.equal((await messageService.messages(conversationId, second.id)).length, 1);

  const results = await searchService.search(first.id, "Builders");
  assert.equal(results.groups.length, 1);
  assert.ok(await notificationService.unreadCount(first.id) > 0);
});

test("HTTP API returns the extended post contract", async (t) => {
  if (!mongoAvailable) return t.skip("Set MONGODB_URI to an Atlas URI or RUN_MONGO_TESTS=1 to run MongoDB integration tests.");
  assert.ok(await userByEmail("first@example.com"));
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const email = `http-${Date.now()}@example.com`;
    const registration = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: "HTTP",
        lastName: "Tester",
        email,
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
        acceptedTerms: true,
      }),
    });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get("set-cookie").split(";")[0];
    const response = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        content: "API article",
        visibility: "public",
        postType: "article",
        articleTitle: "HTTP contract",
        articleBody: "Verified through Express.",
      }),
    });
    assert.equal(response.status, 201);
    const payload = await response.json();
    assert.equal(payload.data.post.postType, "article");
    assert.equal(payload.data.post.article.title, "HTTP contract");
    assert.equal(payload.data.post.commentCount, 0);
    assert.equal(payload.data.post.commentsNextCursor, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
