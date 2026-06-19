const bcrypt = require("bcryptjs");
const db = require(".");
const authService = require("../services/auth-service");
const postService = require("../services/post-service");
const groupService = require("../services/group-service");
const eventService = require("../services/event-service");
const networkService = require("../services/network-service");
const messageService = require("../services/message-service");

const password = "AppifyDemo123!";
const users = [
  ["Demo", "User", "demo@appify.local", "Software Developer"],
  ["Ryan", "Roslansky", "ryan@appify.local", "Product Designer"],
  ["Evan", "You", "evan@appify.local", "Frontend Engineer"],
  ["Sarah", "Chen", "sarah@appify.local", "UX Researcher"],
  ["Marcus", "Johnson", "marcus@appify.local", "Data Scientist"],
  ["Priya", "Patel", "priya@appify.local", "Marketing Lead"],
  ["James", "Wilson", "james@appify.local", "DevOps Engineer"],
  ["Emily", "Rodriguez", "emily@appify.local", "Content Creator"],
  ["Alex", "Kim", "alex@appify.local", "AI Researcher"],
  ["Olivia", "Thompson", "olivia@appify.local", "Startup Founder"],
];

function avatarUrl(firstName, lastName) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(`${firstName} ${lastName}`)}&background=random`;
}

async function main() {
  await db.reset();
  const userCollection = await db.collection("users");
  const profileCollection = await db.collection("user_profiles");

  const created = [];
  for (const [firstName, lastName, email, workplace] of users) {
    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
      confirmPassword: password,
      acceptedTerms: true,
    });
    created.push(result.user);
    await userCollection.updateOne({ id: result.user.id }, { $set: { avatar_url: avatarUrl(firstName, lastName) } });
    await profileCollection.updateOne({ user_id: result.user.id }, {
      $set: {
        bio: `${workplace} exploring what useful social software can feel like.`,
        workplace,
        location: "Dhaka",
        privacy: "public",
        updated_at: db.timestamp(),
      },
    });
  }

  const demo = created[0];
  for (const user of created.slice(1)) {
    await networkService.toggleFollow(user.id, demo.id);
    await networkService.toggleFollow(demo.id, user.id);
    await networkService.sendRequest(user.id, demo.id);
    const request = (await networkService.requests(demo.id)).find((item) => item.user.id === user.id);
    if (request) await networkService.respond(demo.id, request.id, "accepted");
  }

  const posts = [
    "Welcome to Appify. This demo feed is now backed by MongoDB and ready for hosted deployment.",
    "Shipping a social app feels calmer when uploads live outside the server filesystem.",
    "Realtime presence and messages still run through Socket.IO.",
    "Cloud deployment checklists are underrated: environment variables, CORS, cookies, and one clean start command.",
  ];
  for (let index = 0; index < posts.length; index += 1) {
    const author = created[index % created.length];
    const post = await postService.createPost(author.id, { content: posts[index], visibility: "public" });
    await postService.toggleReaction("post", post.id, demo.id, index % 2 ? "love" : "like");
    await postService.addComment(post.id, created[(index + 1) % created.length].id, { content: "This is looking good." });
  }

  const groupId = await groupService.create(demo.id, { name: "Appify Builders", description: "A group for product builders.", privacy: "public" });
  await groupService.toggleMembership(groupId, created[1].id);
  await groupService.createPost(groupId, created[1].id, { content: "Hello from the MongoDB-backed group feed." });

  const eventId = await eventService.create(demo.id, {
    title: "Appify Launch Meetup",
    description: "A casual launch event for the hosted Appify demo.",
    location: "Online",
    startsAt: "2030-01-01T10:00:00.000Z",
  });
  await eventService.attend(eventId, created[1].id, "going");

  const conversationId = await messageService.getOrCreate(demo.id, created[1].id);
  await messageService.send(conversationId, demo.id, { content: "The deployment migration is ready." });

  console.log(`Seeded ${created.length} users with password ${password}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.close());
