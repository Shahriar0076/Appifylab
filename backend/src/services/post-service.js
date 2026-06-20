const { z } = require("zod");
const db = require("../db");
const HttpError = require("../utils/http-error");
const notifications = require("./notification-service");

const postSchema = z.object({
  content: z.string().trim().max(5000).default(""),
  visibility: z.enum(["public", "private"]).default("public"),
  postType: z.enum(["standard", "article"]).default("standard"),
  articleTitle: z.string().trim().max(200).optional(),
  articleBody: z.string().trim().max(20000).optional(),
});

function imageUrl(file) {
  return file?.path || null;
}

async function userById(userId) {
  const users = await db.collection("users");
  return users.findOne({ id: userId });
}

async function canViewPost(post, userId) {
  if (!post.group_id) return post.visibility === "public" || post.author_id === userId;
  const groups = await db.collection("groups");
  const members = await db.collection("group_members");
  const group = await groups.findOne({ id: post.group_id });
  if (!group) return false;
  return group.privacy === "public" || Boolean(await members.findOne({ group_id: post.group_id, user_id: userId }));
}

async function assertVisiblePost(postId, userId) {
  const posts = await db.collection("posts");
  const post = await posts.findOne({ id: postId, is_deleted: false });
  if (!post || !(await canViewPost(post, userId))) throw new HttpError(404, "Post was not found.");
  return post;
}

async function postContext(postId) {
  const posts = await db.collection("posts");
  const row = await posts.findOne({ id: postId }, { projection: { id: 1, group_id: 1 } });
  return row ? { id: row.id, groupId: row.group_id || null } : { id: postId, groupId: null };
}

async function commentContext(commentId) {
  const comments = await db.collection("comments");
  const posts = await db.collection("posts");
  const comment = await comments.findOne({ id: commentId });
  const post = comment ? await posts.findOne({ id: comment.post_id }) : null;
  return post ? { id: post.id, groupId: post.group_id || null } : { id: null, groupId: null };
}

async function getReactionSummary(targetType, targetId, userId) {
  const reactions = await db.collection("reactions");
  const rows = await reactions.find({ target_type: targetType, target_id: targetId }).sort({ created_at: -1 }).toArray();
  const users = await db.collection("users");
  const mapped = await Promise.all(rows.map(async (row) => {
    const user = await users.findOne({ id: row.user_id });
    return {
      id: user.id,
      username: user.username,
      name: `${user.first_name} ${user.last_name}`,
      avatarUrl: user.avatar_url,
      reactionType: row.reaction_type,
    };
  }));
  return {
    count: rows.length,
    currentUserReaction: rows.find((row) => row.user_id === userId)?.reaction_type || null,
    users: mapped,
  };
}

async function serializeComment(row, userId, allComments) {
  const user = await userById(row.author_id);
  const replies = allComments.filter((comment) => comment.parent_id === row.id);
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id,
    content: row.content,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: user.username,
      name: `${user.first_name} ${user.last_name}`,
      avatarUrl: user.avatar_url,
    },
    isOwner: row.author_id === userId,
    reactions: await getReactionSummary("comment", row.id, userId),
    replies: await Promise.all(replies.map((reply) => serializeComment(reply, userId, []))),
  };
}

async function commentPage(postId, userId, cursor = null, limit = 3) {
  const comments = await db.collection("comments");
  const safeLimit = Math.min(Math.max(Number(limit) || 3, 1), 30);
  const roots = await comments.find({
    post_id: postId,
    parent_id: null,
    is_deleted: false,
    ...(cursor ? { id: { $lt: Number(cursor) } } : {}),
  }).sort({ id: -1 }).limit(safeLimit + 1).toArray();
  const hasMore = roots.length > safeLimit;
  const page = roots.slice(0, safeLimit);
  const replies = page.length
    ? await comments.find({ is_deleted: false, parent_id: { $in: page.map((comment) => comment.id) } }).sort({ created_at: 1 }).toArray()
    : [];
  return {
    items: await Promise.all(page.map((comment) => serializeComment(comment, userId, replies))),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    totalCount: await comments.countDocuments({ post_id: postId, is_deleted: false }),
  };
}

async function serializePost(row, userId) {
  const [author, comments, savedPosts, postSubscriptions, posts, articles, commentShares, groups] = await Promise.all([
    userById(row.author_id),
    commentPage(row.id, userId),
    db.collection("saved_posts"),
    db.collection("post_subscriptions"),
    db.collection("posts"),
    db.collection("articles"),
    db.collection("comment_shares"),
    db.collection("groups"),
  ]);
  const saved = Boolean(await savedPosts.findOne({ user_id: userId, post_id: row.id }));
  let sourceRow = row.share_of_id ? await posts.findOne({ id: row.share_of_id, is_deleted: false }) : null;
  if (sourceRow && !(await canViewPost(sourceRow, userId))) sourceRow = null;
  const sourceAuthor = sourceRow ? await userById(sourceRow.author_id) : null;
  const article = row.post_type === "article" ? await articles.findOne({ post_id: row.id }, { projection: { _id: 0, title: 1, body: 1 } }) : null;
  const shared = await commentShares.findOne({ shared_post_id: row.id });
  let sharedComment = null;
  if (shared) {
    const commentCollection = await db.collection("comments");
    sharedComment = await commentCollection.findOne({ id: shared.comment_id, is_deleted: false });
    const source = sharedComment ? await posts.findOne({ id: sharedComment.post_id, is_deleted: false }) : null;
    if (!source || !(await canViewPost(source, userId))) sharedComment = null;
  }
  const sharedAuthor = sharedComment ? await userById(sharedComment.author_id) : null;
  const group = row.group_id ? await groups.findOne({ id: row.group_id }) : null;
  return {
    id: row.id,
    content: row.content,
    imageUrl: row.image_url,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postType: row.post_type || "standard",
    article: article || null,
    shareOfId: row.share_of_id,
    group: group ? { id: group.id, slug: group.slug, name: group.name } : null,
    sharedPost: sourceRow ? {
      id: sourceRow.id,
      content: sourceRow.content,
      imageUrl: sourceRow.image_url,
      createdAt: sourceRow.created_at,
      author: {
        id: sourceAuthor.id,
        username: sourceAuthor.username,
        name: `${sourceAuthor.first_name} ${sourceAuthor.last_name}`,
        avatarUrl: sourceAuthor.avatar_url,
      },
    } : null,
    sharedComment: sharedComment ? {
      id: sharedComment.id,
      postId: sharedComment.post_id,
      content: sharedComment.content,
      imageUrl: sharedComment.image_url,
      createdAt: sharedComment.created_at,
      author: {
        id: sharedAuthor.id,
        username: sharedAuthor.username,
        name: `${sharedAuthor.first_name} ${sharedAuthor.last_name}`,
        avatarUrl: sharedAuthor.avatar_url,
      },
    } : null,
    isOwner: row.author_id === userId,
    isSaved: saved,
    notificationsEnabled: Boolean(await postSubscriptions.findOne({ user_id: userId, post_id: row.id })),
    author: {
      id: row.author_id,
      username: author.username,
      name: `${author.first_name} ${author.last_name}`,
      avatarUrl: author.avatar_url,
    },
    reactions: await getReactionSummary("post", row.id, userId),
    comments: comments.items,
    commentsNextCursor: comments.nextCursor,
    commentCount: comments.totalCount,
    shareCount: await posts.countDocuments({ share_of_id: row.id, is_deleted: false }),
  };
}

async function listPosts(userId, cursor, limit = 10) {
  const posts = await db.collection("posts");
  const hidden = await db.collection("hidden_posts");
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 30);
  const hiddenIds = (await hidden.find({ user_id: userId }).toArray()).map((row) => row.post_id);
  const rows = await posts.find({
    is_deleted: false,
    group_id: null,
    id: { ...(cursor ? { $lt: Number(cursor) } : {}), $nin: hiddenIds },
    $or: [{ visibility: "public" }, { author_id: userId }],
  }).sort({ id: -1 }).limit(safeLimit + 1).toArray();
  const page = rows.slice(0, safeLimit);
  return {
    items: await Promise.all(page.map((row) => serializePost(row, userId))),
    nextCursor: rows.length > safeLimit ? page[page.length - 1].id : null,
  };
}

async function listUserPosts(authorId, viewerId) {
  const posts = await db.collection("posts");
  const rows = await posts.find({
    author_id: authorId,
    group_id: null,
    is_deleted: false,
    $or: [{ visibility: "public" }, { author_id: viewerId }],
  }).sort({ id: -1 }).limit(50).toArray();
  return Promise.all(rows.map((row) => serializePost(row, viewerId)));
}

async function listSaved(userId) {
  const savedPosts = await db.collection("saved_posts");
  const posts = await db.collection("posts");
  const saved = await savedPosts.find({ user_id: userId }).sort({ created_at: -1 }).toArray();
  const rows = await posts.find({ id: { $in: saved.map((row) => row.post_id) }, is_deleted: false }).toArray();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = saved.map((item) => byId.get(item.post_id)).filter(Boolean);
  const visible = [];
  for (const row of ordered) {
    if ((row.visibility === "public" || row.author_id === userId) && await canViewPost(row, userId)) visible.push(row);
  }
  return Promise.all(visible.map((row) => serializePost(row, userId)));
}

async function listGroupPosts(groupId, userId, cursor = null, limit = 50) {
  const groups = await db.collection("groups");
  const members = await db.collection("group_members");
  const posts = await db.collection("posts");
  const hidden = await db.collection("hidden_posts");
  const paged = arguments.length >= 4;
  const group = await groups.findOne({ id: groupId });
  const member = await members.findOne({ group_id: groupId, user_id: userId });
  if (!group || (group.privacy !== "public" && !member)) throw new HttpError(404, "Group was not found.");
  const hiddenIds = (await hidden.find({ user_id: userId }).toArray()).map((row) => row.post_id);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
  const rows = await posts.find({
    group_id: groupId,
    is_deleted: false,
    id: { ...(cursor ? { $lt: Number(cursor) } : {}), $nin: hiddenIds },
  }).sort({ id: -1 }).limit(safeLimit + 1).toArray();
  const page = rows.slice(0, safeLimit);
  const items = await Promise.all(page.map((row) => serializePost(row, userId)));
  const result = { items, nextCursor: rows.length > safeLimit ? page[page.length - 1].id : null };
  return paged ? result : result.items;
}

async function createPost(userId, input, file, options = {}) {
  const data = postSchema.parse(input);
  const groupId = options.groupId ? Number(options.groupId) : null;
  const members = await db.collection("group_members");
  if (groupId && !(await members.findOne({ group_id: groupId, user_id: userId }))) {
    throw new HttpError(403, "Join this group before posting.");
  }
  if (data.postType === "article" && (!data.articleTitle || !data.articleBody)) {
    throw new HttpError(400, "Article title and body are required.");
  }
  if (data.postType === "standard" && !data.content && !file) {
    throw new HttpError(400, "Write something or select an image.");
  }
  const posts = await db.collection("posts");
  const now = db.timestamp();
  const id = await db.nextId("posts");
  const post = {
    id,
    author_id: userId,
    group_id: groupId,
    content: data.content,
    image_url: imageUrl(file),
    visibility: data.visibility,
    post_type: data.postType,
    share_of_id: null,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  };
  await posts.insertOne(post);
  if (data.postType === "article") {
    const articles = await db.collection("articles");
    await articles.insertOne({ post_id: id, title: data.articleTitle, body: data.articleBody, created_at: now, updated_at: now });
  }
  return serializePost(post, userId);
}

async function updatePost(postId, userId, input) {
  const data = postSchema.partial().parse(input);
  const posts = await db.collection("posts");
  const post = await posts.findOne({ id: postId, is_deleted: false });
  if (!post) throw new HttpError(404, "Post was not found.");
  if (post.author_id !== userId) throw new HttpError(403, "You cannot edit this post.");
  await posts.updateOne({ id: postId }, { $set: { content: data.content ?? post.content, visibility: data.visibility ?? post.visibility, updated_at: db.timestamp() } });
  if (post.post_type === "article" && (data.articleTitle !== undefined || data.articleBody !== undefined)) {
    const articles = await db.collection("articles");
    const article = await articles.findOne({ post_id: postId });
    await articles.updateOne({ post_id: postId }, { $set: { title: data.articleTitle ?? article.title, body: data.articleBody ?? article.body, updated_at: db.timestamp() } });
  }
}

async function deletePost(postId, userId) {
  const posts = await db.collection("posts");
  const result = await posts.updateOne({ id: postId, author_id: userId, is_deleted: false }, { $set: { is_deleted: true, updated_at: db.timestamp() } });
  if (!result.modifiedCount) throw new HttpError(404, "Post was not found or cannot be deleted.");
}

async function toggleReaction(targetType, targetId, userId, reactionType = "like") {
  z.enum(["post", "comment"]).parse(targetType);
  z.enum(["like", "love", "haha"]).parse(reactionType);
  const reactions = await db.collection("reactions");
  if (targetType === "post") await assertVisiblePost(targetId, userId);
  if (targetType === "comment") {
    const comments = await db.collection("comments");
    const comment = await comments.findOne({ id: targetId, is_deleted: false });
    if (!comment) throw new HttpError(404, "Comment was not found.");
    await assertVisiblePost(comment.post_id, userId);
  }
  const existing = await reactions.findOne({ user_id: userId, target_type: targetType, target_id: targetId });
  if (existing?.reaction_type === reactionType) {
    await reactions.deleteOne({ _id: existing._id });
  } else {
    const now = db.timestamp();
    await reactions.updateOne(
      { user_id: userId, target_type: targetType, target_id: targetId },
      { $set: { reaction_type: reactionType, created_at: now }, $setOnInsert: { id: await db.nextId("reactions"), user_id: userId, target_type: targetType, target_id: targetId } },
      { upsert: true },
    );
    if (targetType === "post") {
      const posts = await db.collection("posts");
      const post = await posts.findOne({ id: targetId });
      await notifications.createNotification(post.author_id, userId, "post_reaction", `reacted ${reactionType} to your post.`, "post", targetId);
    } else {
      const comments = await db.collection("comments");
      const comment = await comments.findOne({ id: targetId });
      await notifications.createNotification(comment.author_id, userId, "comment_reaction", `reacted ${reactionType} to your comment.`, "comment", targetId);
    }
  }
  return getReactionSummary(targetType, targetId, userId);
}

async function addComment(postId, userId, input, file) {
  const data = z.object({
    content: z.string().trim().max(2000).default(""),
    parentId: z.coerce.number().int().positive().nullable().optional(),
  }).parse(input);
  await assertVisiblePost(postId, userId);
  if (!data.content && !file) throw new HttpError(400, "Comment cannot be empty.");
  const comments = await db.collection("comments");
  if (data.parentId) {
    const parent = await comments.findOne({ id: data.parentId, post_id: postId, parent_id: null });
    if (!parent) throw new HttpError(400, "Reply parent is invalid.");
  }
  const id = await db.nextId("comments");
  const now = db.timestamp();
  await comments.insertOne({
    id,
    post_id: postId,
    author_id: userId,
    parent_id: data.parentId || null,
    content: data.content,
    image_url: imageUrl(file),
    is_deleted: false,
    created_at: now,
    updated_at: now,
  });
  const posts = await db.collection("posts");
  const post = await posts.findOne({ id: postId });
  const recipient = data.parentId ? (await comments.findOne({ id: data.parentId }))?.author_id : post.author_id;
  await notifications.createNotification(recipient, userId, data.parentId ? "reply" : "comment", data.parentId ? "replied to your comment." : "commented on your post.", "post", postId);
  const subs = await db.collection("post_subscriptions");
  const subscribers = await subs.find({ post_id: postId, user_id: { $ne: userId } }).toArray();
  await Promise.all(subscribers.map(({ user_id }) => notifications.createNotification(user_id, userId, "post_activity", "added activity to a post you follow.", "post", postId)));
  return id;
}

async function listComments(postId, userId, cursor, limit) {
  await assertVisiblePost(postId, userId);
  return commentPage(postId, userId, cursor, limit);
}

async function updateComment(commentId, userId, input) {
  const content = z.string().trim().min(1).max(2000).parse(input.content);
  const comments = await db.collection("comments");
  const result = await comments.updateOne({ id: commentId, author_id: userId, is_deleted: false }, { $set: { content, updated_at: db.timestamp() } });
  if (!result.modifiedCount) throw new HttpError(404, "Comment was not found or cannot be edited.");
}

async function deleteComment(commentId, userId) {
  const comments = await db.collection("comments");
  const result = await comments.updateOne({ id: commentId, author_id: userId, is_deleted: false }, { $set: { is_deleted: true, updated_at: db.timestamp() } });
  if (!result.modifiedCount) throw new HttpError(404, "Comment was not found or cannot be deleted.");
}

async function toggleSaved(postId, userId) {
  await assertVisiblePost(postId, userId);
  const saved = await db.collection("saved_posts");
  const existing = await saved.findOne({ user_id: userId, post_id: postId });
  if (existing) await saved.deleteOne({ _id: existing._id });
  else await saved.insertOne({ user_id: userId, post_id: postId, created_at: db.timestamp() });
  return !existing;
}

async function hidePost(postId, userId) {
  await assertVisiblePost(postId, userId);
  const hidden = await db.collection("hidden_posts");
  await hidden.updateOne({ user_id: userId, post_id: postId }, { $setOnInsert: { user_id: userId, post_id: postId, created_at: db.timestamp() } }, { upsert: true });
}

async function sharePost(postId, userId, input = {}) {
  const source = await assertVisiblePost(postId, userId);
  const content = z.string().trim().max(5000).optional().parse(input.content);
  const posts = await db.collection("posts");
  const now = db.timestamp();
  const id = await db.nextId("posts");
  const row = {
    id,
    author_id: userId,
    group_id: source.group_id,
    content: content || "",
    image_url: null,
    visibility: input.visibility === "private" ? "private" : "public",
    post_type: "standard",
    share_of_id: source.id,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  };
  await posts.insertOne(row);
  await notifications.createNotification(source.author_id, userId, "share", "shared your post.", "post", source.id);
  return serializePost(row, userId);
}

async function shareComment(commentId, userId, input = {}) {
  const comments = await db.collection("comments");
  const comment = await comments.findOne({ id: commentId, is_deleted: false });
  const posts = await db.collection("posts");
  const source = comment ? await posts.findOne({ id: comment.post_id, is_deleted: false }) : null;
  if (!comment || !source || !(await canViewPost(source, userId))) throw new HttpError(404, "Comment was not found.");
  const content = z.string().trim().max(5000).optional().parse(input.content);
  const now = db.timestamp();
  const id = await db.nextId("posts");
  const row = {
    id,
    author_id: userId,
    group_id: source.group_id,
    content: content || "",
    image_url: null,
    visibility: input.visibility === "private" ? "private" : "public",
    post_type: "standard",
    share_of_id: null,
    is_deleted: false,
    created_at: now,
    updated_at: now,
  };
  await posts.insertOne(row);
  const commentShares = await db.collection("comment_shares");
  await commentShares.insertOne({ shared_post_id: id, comment_id: commentId, created_at: now });
  await notifications.createNotification(comment.author_id, userId, "share", "shared your comment.", "comment", commentId);
  return serializePost(row, userId);
}

async function toggleSubscription(postId, userId) {
  await assertVisiblePost(postId, userId);
  const subs = await db.collection("post_subscriptions");
  const existing = await subs.findOne({ user_id: userId, post_id: postId });
  if (existing) await subs.deleteOne({ _id: existing._id });
  else await subs.insertOne({ user_id: userId, post_id: postId, created_at: db.timestamp() });
  return !existing;
}

module.exports = {
  listPosts, listUserPosts, listSaved, listGroupPosts, createPost, updatePost, deletePost, toggleReaction,
  addComment, listComments, updateComment, deleteComment, toggleSaved, hidePost, sharePost,
  shareComment, toggleSubscription, postContext, commentContext, canViewPost,
};
