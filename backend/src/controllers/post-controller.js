const postService = require("../services/post-service");
const { broadcast } = require("../realtime");

async function emitChange(type, id) {
  const context = await postService.postContext(id);
  const payload = { type, id, at: new Date().toISOString() };
  if (context.groupId) broadcast("group:changed", { ...payload, groupId: context.groupId });
  else broadcast("feed:changed", payload);
}

async function emitCommentChange(type, commentId) {
  const context = await postService.commentContext(commentId);
  if (context.id) await emitChange(type, context.id);
}

async function list(req, res) {
  res.json({ data: await postService.listPosts(req.user.id, req.query.cursor, req.query.limit) });
}

async function saved(req, res) {
  res.json({ data: await postService.listSaved(req.user.id) });
}

async function create(req, res) {
  const post = await postService.createPost(req.user.id, req.body, req.file);
  await emitChange("post.created", post.id);
  res.status(201).json({ data: { post } });
}

async function update(req, res) {
  await postService.updatePost(Number(req.params.postId), req.user.id, req.body);
  await emitChange("post.updated", Number(req.params.postId));
  res.status(204).end();
}

async function remove(req, res) {
  await postService.deletePost(Number(req.params.postId), req.user.id);
  await emitChange("post.deleted", Number(req.params.postId));
  res.status(204).end();
}

async function react(req, res) {
  const reactions = await postService.toggleReaction(req.params.targetType, Number(req.params.targetId), req.user.id, req.body.reactionType);
  if (req.params.targetType === "comment") await emitCommentChange("reaction.changed", Number(req.params.targetId));
  else await emitChange("reaction.changed", Number(req.params.targetId));
  res.json({ data: { reactions } });
}

async function comment(req, res) {
  const id = await postService.addComment(Number(req.params.postId), req.user.id, req.body, req.file);
  await emitChange("comment.created", Number(req.params.postId));
  res.status(201).json({ data: { id } });
}

async function comments(req, res) {
  res.json({ data: await postService.listComments(
    Number(req.params.postId), req.user.id, req.query.cursor, req.query.limit,
  ) });
}

async function updateComment(req, res) {
  await postService.updateComment(Number(req.params.commentId), req.user.id, req.body);
  await emitCommentChange("comment.updated", Number(req.params.commentId));
  res.status(204).end();
}

async function removeComment(req, res) {
  await postService.deleteComment(Number(req.params.commentId), req.user.id);
  await emitCommentChange("comment.deleted", Number(req.params.commentId));
  res.status(204).end();
}

async function share(req, res) {
  const post = await postService.sharePost(Number(req.params.postId), req.user.id, req.body);
  await emitChange("post.shared", Number(req.params.postId));
  await emitChange("post.shared", post.id);
  res.status(201).json({ data: { post } });
}

async function shareComment(req, res) {
  const context = await postService.commentContext(Number(req.params.commentId));
  const post = await postService.shareComment(Number(req.params.commentId), req.user.id, req.body);
  if (context.id) await emitChange("comment.shared", context.id);
  await emitChange("comment.shared", post.id);
  res.status(201).json({ data: { post } });
}

async function subscription(req, res) {
  const enabled = await postService.toggleSubscription(Number(req.params.postId), req.user.id);
  res.json({ data: { enabled } });
}

async function save(req, res) {
  const isSaved = await postService.toggleSaved(Number(req.params.postId), req.user.id);
  res.json({ data: { isSaved } });
}

async function hide(req, res) {
  await postService.hidePost(Number(req.params.postId), req.user.id);
  res.status(204).end();
}

module.exports = {
  list, saved, create, update, remove, react, comment, comments, updateComment,
  removeComment, share, shareComment, subscription, save, hide,
};
