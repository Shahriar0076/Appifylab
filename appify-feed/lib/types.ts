export type User = {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  avatarUrl: string | null;
};

export type ReactionType = "like" | "love" | "haha";

export type ReactionSummary = {
  count: number;
  currentUserReaction: ReactionType | null;
  users: Array<User & { reactionType: ReactionType }>;
};

export type Comment = {
  id: number;
  postId: number;
  parentId: number | null;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: User;
  isOwner: boolean;
  reactions: ReactionSummary;
  replies: Comment[];
};

export type Post = {
  id: number;
  content: string;
  imageUrl: string | null;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  postType: "standard" | "article";
  article: { title: string; body: string } | null;
  shareOfId: number | null;
  group: { id: number; slug: string; name: string } | null;
  sharedPost: {
    id: number;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    author: User;
  } | null;
  sharedComment: {
    id: number;
    postId: number;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    author: User;
  } | null;
  isOwner: boolean;
  isSaved: boolean;
  notificationsEnabled: boolean;
  author: User;
  reactions: ReactionSummary;
  comments: Comment[];
  commentsNextCursor: number | null;
  commentCount: number;
  shareCount: number;
};

export type Insights = {
  summary: {
    totalPosts: number;
    reactionsReceived: number;
    commentsReceived: number;
    sharesReceived: number;
    followers: number;
    following: number;
    friends: number;
    groupsJoined: number;
    eventsAttended: number;
  };
  activity: Array<{ date: string; posts: number; reactions: number; comments: number }>;
  followerGrowth: Array<{ date: string; gained: number }>;
  topPosts: Array<{ id: number; content: string; imageUrl: string | null; createdAt: string; reactionCount: number; commentCount: number }>;
  engagementRate: number;
  engagementByDay: Array<{ date: string; rate: number }>;
};
