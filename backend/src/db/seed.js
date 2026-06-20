const fs = require("node:fs");
const path = require("node:path");
const { v2: cloudinary } = require("cloudinary");
const db = require(".");
const config = require("../config");
const authService = require("../services/auth-service");
const postService = require("../services/post-service");
const groupService = require("../services/group-service");
const eventService = require("../services/event-service");
const networkService = require("../services/network-service");
const messageService = require("../services/message-service");
const storyService = require("../services/story-service");

const password = "AppifyDemo123!";
const sourceRoot = "C:\\Users\\Shahriar\\Downloads\\images";
const localUploadsPath = path.resolve(__dirname, "../../uploads");
const demoFolder = `${config.cloudinary.folder}/demo-seed`;

const users = [
  ["John", "Doe", "john@appify.local", "Product Manager", "Dhaka", "Turning ideas into clean launch plans."],
  ["Jane", "Smith", "jane@appify.local", "UX Designer", "Chittagong", "Designing calm workflows for busy teams."],
  ["Bob", "Johnson", "bob@appify.local", "Backend Engineer", "Sylhet", "Building sturdy APIs and coffee rituals."],
  ["Alice", "Williams", "alice@appify.local", "Frontend Engineer", "Khulna", "Making interfaces feel fast, clear, and human."],
  ["Charlie", "Brown", "charlie@appify.local", "Community Lead", "Rajshahi", "Connecting people around useful projects."],
  ["Diana", "Prince", "diana@appify.local", "Security Analyst", "Dhaka", "Helping teams ship with confidence."],
  ["Edward", "Norton", "edward@appify.local", "Data Scientist", "Barisal", "Finding signal in messy product data."],
  ["Fiona", "Apple", "fiona@appify.local", "Content Strategist", "Dhaka", "Writing stories that make products easier to trust."],
  ["George", "Lucas", "george@appify.local", "Video Producer", "Cox's Bazar", "Creating launch videos and behind-the-scenes clips."],
  ["Helen", "Mirren", "helen@appify.local", "Startup Founder", "Rangpur", "Building small tools with a big-hearted team."],
];

const postCopy = [
  "Weekend field notes: a short trip, a long walk, and a lot of good product ideas in the margins.",
  "Testing a new breakfast spot before standup. The team voted this one into the regular rotation.",
  "Reset day: sunlight, movement, and a playlist that kept the whole session moving.",
  "A small music corner at home is slowly becoming my favorite thinking space.",
  "Sketching the first draft before opening any design tool still saves the most time.",
  "Trying a bolder outfit for the investor meetup. Confidence is part of the demo.",
  "A quiet afternoon with a reading list that is mostly product, strategy, and one good novel.",
  "Coffee, notes, and a launch checklist. This is the part of building that looks boring and matters most.",
  "Sharing a few travel frames from the last team offsite. Fresh air is underrated infrastructure.",
  "The design review turned into a food review, which honestly improved morale by 40 percent.",
  "Morning training before a deep work block. Energy management is project management.",
  "Found a live set that made the whole commute feel cinematic.",
  "New color studies for the next campaign. The messy wall phase is the best phase.",
  "A few wardrobe tests for our creator shoot. The simple look won.",
  "Book club notes from a surprisingly useful chapter on decision quality.",
  "Coffee number two and still pretending it is part of the methodology.",
  "Tiny escape after a long sprint. The best debugging tool was leaving the desk.",
  "Team lunch, loud table, excellent ideas. Some meetings should have better snacks.",
  "Back to the gym after a travel week. Starting again counts.",
  "Evening playlist for shipping the last polish pass.",
];

const commentCopy = [
  "This looks fantastic.",
  "Adding this to my inspiration board.",
  "The timing on this is perfect.",
  "I want the full story behind this.",
  "This is exactly the kind of update I needed today.",
  "Strong launch energy here.",
];

const replyCopy = [
  "Agreed, this one has a really nice feel.",
  "I was thinking the same thing.",
  "Let's bring this up in the next planning chat.",
  "The details make it work.",
];

const groups = [
  ["Appify Builders", "For people shaping the Appify product and launch playbook."],
  ["Design Circle", "A friendly place for critique, references, and better UI decisions."],
  ["Startup Operators", "Notes from founders, operators, and the people keeping launches alive."],
  ["Dhaka Tech Network", "Local builders sharing events, jobs, and collaboration ideas."],
  ["Creator Studio", "Video, writing, social, and campaign experiments."],
  ["Data & AI Lab", "Practical experiments with analytics, AI features, and automation."],
  ["Remote Work Club", "Routines and tools for distributed teams."],
  ["Wellness At Work", "Healthy habits for people who spend too much time in tabs."],
  ["Product Marketing Hub", "Positioning, launch messaging, and growth ideas."],
  ["Weekend Explorers", "Trips, food, photos, and small resets after big weeks."],
];

const groupPostCopy = [
  "Kicking off a fresh thread for ideas, links, and small wins from this week.",
  "Sharing a visual reference that could be useful for the next group discussion.",
  "Quick check-in from today's work session. What should we improve next?",
  "Dropping a resource that sparked a good hallway conversation earlier.",
];

const events = [
  ["Appify Demo Night", "A live walkthrough of the new social demo experience.", "Online"],
  ["Design Systems Workshop", "Hands-on session for cleaner shared components.", "Dhaka Studio"],
  ["Creator Mixer", "A casual evening for writers, designers, and video makers.", "Banani"],
  ["Startup Breakfast", "Founders and operators swap practical launch stories.", "Gulshan"],
  ["AI Product Jam", "Prototype useful AI workflows in small teams.", "Dhanmondi"],
  ["Community Festival", "A public meetup for Appify groups and local builders.", "TSC"],
  ["Security Clinic", "A friendly review session for safer account and upload flows.", "Online"],
  ["Remote Team Games", "A lightweight social hour for distributed teams.", "Online"],
  ["Growth Roundtable", "Campaign ideas, metrics, and lessons from recent launches.", "Uttara"],
  ["Weekend Photo Walk", "A relaxed walk for people who want better product photos.", "Cox's Bazar"],
];

function requireCloudinary() {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    throw new Error("Cloudinary credentials are required for the rich demo seed.");
  }
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

function filesIn(folder) {
  const fullPath = path.join(sourceRoot, folder);
  return fs.readdirSync(fullPath)
    .filter((file) => /\.(jpe?g|png|webp|gif)$/i.test(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => path.join(fullPath, file));
}

function clearLocalUploads() {
  if (!fs.existsSync(localUploadsPath)) {
    fs.mkdirSync(localUploadsPath, { recursive: true });
    return;
  }
  for (const entry of fs.readdirSync(localUploadsPath)) {
    fs.rmSync(path.join(localUploadsPath, entry), { recursive: true, force: true });
  }
}

async function clearCloudinaryImages() {
  const prefixes = [
    `${config.cloudinary.folder}/images`,
    `${config.cloudinary.folder}/attachments`,
    demoFolder,
  ];
  for (const prefix of prefixes) {
    await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "image" });
  }
  await cloudinary.api.delete_folder(demoFolder).catch((error) => {
    if (error?.http_code !== 404 && error?.error?.http_code !== 404) throw error;
  });
}

async function uploadImage(filePath, category, index) {
  const extension = path.extname(filePath);
  const baseName = path.basename(filePath, extension).replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `${demoFolder}/${category}`,
    public_id: `${String(index + 1).padStart(2, "0")}-${baseName}`,
    overwrite: true,
    resource_type: "image",
  });
  return result.secure_url;
}

async function uploadImages() {
  const manifest = {
    avatars: filesIn("profile_pic").slice(0, 10),
    covers: filesIn("cover_photos").slice(0, 10),
    posts: filesIn("posts"),
    groups: filesIn("group_cover").slice(0, 10),
    events: filesIn("event_images").slice(0, 10),
  };

  for (const [name, files] of Object.entries(manifest)) {
    if (files.length < (name === "posts" ? 1 : 10)) {
      throw new Error(`Not enough ${name} images in ${sourceRoot}.`);
    }
  }

  const uploaded = {};
  for (const [category, files] of Object.entries(manifest)) {
    uploaded[category] = [];
    for (let index = 0; index < files.length; index += 1) {
      uploaded[category].push(await uploadImage(files[index], category, index));
    }
  }
  return uploaded;
}

function imageFile(url, originalname = "demo.jpg") {
  return { path: url, originalname };
}

async function createUsers(images) {
  const userCollection = await db.collection("users");
  const profileCollection = await db.collection("user_profiles");
  const created = [];

  for (let index = 0; index < users.length; index += 1) {
    const [firstName, lastName, email, workplace, location, bio] = users[index];
    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
      confirmPassword: password,
      acceptedTerms: true,
    });
    created.push(result.user);
    await userCollection.updateOne({ id: result.user.id }, {
      $set: { avatar_url: images.avatars[index], updated_at: db.timestamp() },
    });
    await profileCollection.updateOne({ user_id: result.user.id }, {
      $set: {
        bio,
        cover_url: images.covers[index],
        workplace,
        location,
        privacy: "public",
        updated_at: db.timestamp(),
      },
    });
  }

  return created;
}

async function createNetwork(created) {
  const friendPairs = [
    [0, 1], [0, 2], [0, 3], [1, 4], [1, 5],
    [2, 6], [2, 7], [3, 8], [4, 9], [5, 6],
    [7, 8], [8, 9],
  ];

  for (const [senderIndex, receiverIndex] of friendPairs) {
    const sender = created[senderIndex];
    const receiver = created[receiverIndex];
    await networkService.sendRequest(sender.id, receiver.id);
    const request = (await networkService.requests(receiver.id)).find((item) => item.user.id === sender.id);
    if (request) await networkService.respond(receiver.id, request.id, "accepted");
  }

  for (let index = 0; index < created.length; index += 1) {
    const user = created[index];
    const followTargets = [
      created[(index + 1) % created.length],
      created[(index + 3) % created.length],
      created[(index + 5) % created.length],
    ];
    for (const target of followTargets) {
      await networkService.toggleFollow(user.id, target.id);
    }
  }
}

async function createPosts(created, images) {
  const posts = [];
  for (let index = 0; index < 20; index += 1) {
    const author = created[index % created.length];
    const post = await postService.createPost(
      author.id,
      { content: postCopy[index], visibility: "public" },
      imageFile(images.posts[index % images.posts.length], `post-${index + 1}.jpg`),
    );
    posts.push(post);
  }

  const reactionTypes = ["like", "love", "haha"];
  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index];
    const authorIndex = index % created.length;
    const reactors = [1, 2, 3, 4, 5].map((offset) => created[(authorIndex + offset) % created.length]);
    for (let reactorIndex = 0; reactorIndex < reactors.length; reactorIndex += 1) {
      await postService.toggleReaction("post", post.id, reactors[reactorIndex].id, reactionTypes[(index + reactorIndex) % reactionTypes.length]);
    }

    const firstCommentId = await postService.addComment(post.id, created[(authorIndex + 2) % created.length].id, {
      content: commentCopy[index % commentCopy.length],
    });
    const secondCommentId = await postService.addComment(post.id, created[(authorIndex + 4) % created.length].id, {
      content: commentCopy[(index + 1) % commentCopy.length],
    });
    await postService.addComment(post.id, created[(authorIndex + 6) % created.length].id, {
      content: replyCopy[index % replyCopy.length],
      parentId: firstCommentId,
    });
    await postService.toggleReaction("comment", firstCommentId, created[(authorIndex + 1) % created.length].id, "love");
    await postService.toggleReaction("comment", secondCommentId, created[(authorIndex + 3) % created.length].id, "like");
  }

  for (let userIndex = 0; userIndex < created.length; userIndex += 1) {
    const user = created[userIndex];
    const savedTargets = posts.filter((post) => post.author.id !== user.id).slice(userIndex, userIndex + 4);
    for (const post of savedTargets) {
      await postService.toggleSaved(post.id, user.id);
    }
  }

  return posts;
}

async function createStories(created, images) {
  for (let index = 0; index < created.length; index += 1) {
    await storyService.create(
      created[index].id,
      imageFile(images.posts[index % images.posts.length], `story-${index + 1}.jpg`),
    );
  }
}

async function createGroups(created, images) {
  const groupIds = [];
  for (let index = 0; index < groups.length; index += 1) {
    const owner = created[index % created.length];
    const [name, description] = groups[index];
    const groupId = await groupService.create(
      owner.id,
      { name, description, privacy: index % 4 === 0 ? "private" : "public" },
      imageFile(images.groups[index], `group-${index + 1}.jpg`),
    );
    groupIds.push(groupId);

    for (let offset = 1; offset <= 5; offset += 1) {
      const member = created[(index + offset) % created.length];
      await groupService.toggleMembership(groupId, member.id);
    }
    if (index % 3 === 0) {
      await groupService.setRole(groupId, owner.id, created[(index + 1) % created.length].id, "moderator");
    }
    for (let postIndex = 0; postIndex < groupPostCopy.length; postIndex += 1) {
      await groupService.createPost(
        groupId,
        created[(index + postIndex) % created.length].id,
        {
          content: `${groupPostCopy[postIndex]} (${name})`,
          visibility: "public",
        },
        imageFile(images.posts[(index * groupPostCopy.length + postIndex) % images.posts.length], `group-post-${index + 1}-${postIndex + 1}.jpg`),
      );
    }
  }
  return groupIds;
}

async function createEvents(created, images) {
  const eventIds = [];
  const base = new Date("2030-02-01T10:00:00.000Z");
  for (let index = 0; index < events.length; index += 1) {
    const creator = created[index % created.length];
    const [title, description, location] = events[index];
    const startsAt = new Date(base.getTime() + index * 3 * 24 * 60 * 60 * 1000).toISOString();
    const eventId = await eventService.create(
      creator.id,
      { title, description, location, startsAt },
      imageFile(images.events[index], `event-${index + 1}.jpg`),
    );
    eventIds.push(eventId);

    await eventService.attend(eventId, creator.id, "going");
    for (let offset = 1; offset <= 4; offset += 1) {
      await eventService.attend(eventId, created[(index + offset) % created.length].id, "going");
    }
    await eventService.attend(eventId, created[(index + 5) % created.length].id, "not_going");
    for (let offset = 6; offset <= 8; offset += 1) {
      await eventService.invite(eventId, creator.id, created[(index + offset) % created.length].id);
    }
  }
  return eventIds;
}

async function createMessages(created) {
  const pairs = [
    [0, 1], [0, 2], [1, 4], [2, 6], [3, 8],
    [4, 9], [5, 7], [6, 8],
  ];

  for (const [firstIndex, secondIndex] of pairs) {
    const first = created[firstIndex];
    const second = created[secondIndex];
    const conversationId = await messageService.getOrCreate(first.id, second.id);
    await messageService.send(conversationId, first.id, { content: "Hey, are you free to review the demo feed today?" });
    await messageService.send(conversationId, second.id, { content: "Yes. The new images and groups make it feel much more real." });
    await messageService.send(conversationId, first.id, { content: "Perfect. I will check events and saved posts next." });
  }
}

async function summarize() {
  const names = [
    "users", "posts", "comments", "reactions", "saved_posts", "follows",
    "friend_requests", "groups", "group_members", "events", "event_attendees",
    "stories", "conversations", "messages", "notifications",
  ];
  const entries = [];
  for (const name of names) {
    const collection = await db.collection(name);
    entries.push(`${name}: ${await collection.countDocuments()}`);
  }
  return entries.join(", ");
}

async function main() {
  requireCloudinary();
  clearLocalUploads();
  await clearCloudinaryImages();
  await db.reset();

  const images = await uploadImages();
  const created = await createUsers(images);
  await createNetwork(created);
  const posts = await createPosts(created, images);
  await createStories(created, images);
  await createGroups(created, images);
  await createEvents(created, images);
  await createMessages(created);

  console.log(`Seeded ${created.length} users, ${posts.length} feed posts, 10 groups, and 10 events.`);
  console.log(`Demo password for every account: ${password}`);
  console.log(await summarize());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.close());
