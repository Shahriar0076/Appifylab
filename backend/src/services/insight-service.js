const db = require("../db");

function dateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 13);
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function sameDay(value, date) {
  return String(value || "").slice(0, 10) === date;
}

async function get(userId) {
  const userIdNum = Number(userId);
  const [posts, reactions, comments, follows, requests, members, attendees] = await Promise.all([
    db.collection("posts"),
    db.collection("reactions"),
    db.collection("comments"),
    db.collection("follows"),
    db.collection("friend_requests"),
    db.collection("group_members"),
    db.collection("event_attendees"),
  ]);

  const userPosts = await posts.find({ author_id: userIdNum, is_deleted: false }).toArray();
  const userPostIds = userPosts.map((post) => post.id);
  const totalPosts = userPosts.length;
  const reactionsReceived = await reactions.countDocuments({ target_type: "post", target_id: { $in: userPostIds } });
  const commentsReceived = await comments.countDocuments({ post_id: { $in: userPostIds }, is_deleted: false });
  const sharesReceived = await posts.countDocuments({ share_of_id: { $in: userPostIds }, is_deleted: false });
  const followers = await follows.countDocuments({ followed_id: userIdNum });
  const following = await follows.countDocuments({ follower_id: userIdNum });
  const friends = await requests.countDocuments({ status: "accepted", $or: [{ sender_id: userIdNum }, { receiver_id: userIdNum }] });
  const groupsJoined = await members.countDocuments({ user_id: userIdNum });
  const eventsAttended = await attendees.countDocuments({ user_id: userIdNum, status: "going" });
  const dates = dateRange();
  const allPostReactions = await reactions.find({ target_type: "post", target_id: { $in: userPostIds } }).toArray();
  const allComments = await comments.find({ post_id: { $in: userPostIds }, is_deleted: false }).toArray();
  const allFollowers = await follows.find({ followed_id: userIdNum }).toArray();

  const activity = dates.map((date) => ({
    date,
    posts: userPosts.filter((post) => sameDay(post.created_at, date)).length,
    reactions: allPostReactions.filter((reaction) => sameDay(reaction.created_at, date)).length,
    comments: allComments.filter((comment) => sameDay(comment.created_at, date)).length,
  }));

  const followerGrowth = dates.map((date) => ({
    date,
    gained: allFollowers.filter((follow) => sameDay(follow.created_at, date)).length,
  }));

  const topPosts = await Promise.all(userPosts.map(async (post) => ({
    id: post.id,
    content: post.content,
    imageUrl: post.image_url,
    createdAt: post.created_at,
    reactionCount: await reactions.countDocuments({ target_type: "post", target_id: post.id }),
    commentCount: await comments.countDocuments({ post_id: post.id, is_deleted: false }),
  })));
  topPosts.sort((a, b) => (b.reactionCount - a.reactionCount) || (b.commentCount - a.commentCount));

  const totalEngagement = reactionsReceived + commentsReceived;
  const engagementRate = totalPosts > 0 ? Math.round((totalEngagement / totalPosts) * 100) / 100 : 0;
  const engagementByDay = dates.map((date) => {
    const day = activity.find((item) => item.date === date);
    const postsForDay = day?.posts || 0;
    const engagement = (day?.reactions || 0) + (day?.comments || 0);
    return { date, rate: postsForDay > 0 ? Math.round((engagement / postsForDay) * 100) / 100 : 0 };
  });

  return {
    summary: { totalPosts, reactionsReceived, commentsReceived, sharesReceived, followers, following, friends, groupsJoined, eventsAttended },
    activity,
    followerGrowth,
    topPosts: topPosts.slice(0, 5),
    engagementRate,
    engagementByDay,
  };
}

module.exports = { get };
