export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  github?: string;
  twitter?: string;
  website?: string;
  joinedAt: Date;
  isOnline: boolean;
  lastActive: Date;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string[];
  author: User;
  createdAt: Date;
  updatedAt: Date;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  isPublished: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  likesCount: number;
  replies: Comment[];
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  members: User[];
  createdBy: User;
  createdAt: Date;
  lastMessage?: ChatMessage;
}

export interface ChatMessage {
  id: string;
  content: string;
  author: User;
  roomId: string;
  type: 'text' | 'code' | 'image' | 'file';
  createdAt: Date;
  edited: boolean;
  reactions: MessageReaction[];
}

export interface MessageReaction {
  emoji: string;
  users: User[];
  count: number;
}

export interface AIConversation {
  id: string;
  title: string;
  userId: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}