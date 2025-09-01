// src/types/index.ts
import { Request } from 'express';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users, oauthProviders, posts, comments,
  chatRooms, chatMessages, roomParticipants,
  aiConversations, aiMessages
} from '../database/schema';

/* ------------------ DATABASE TYPES ------------------ */

// Select Types (for reading from database)
export type User = InferSelectModel<typeof users>;
export type OauthProvider = InferSelectModel<typeof oauthProviders>;
export type Post = InferSelectModel<typeof posts>;
export type Comment = InferSelectModel<typeof comments>;
export type ChatRoom = InferSelectModel<typeof chatRooms>;
export type ChatMessage = InferSelectModel<typeof chatMessages>;
export type RoomParticipant = InferSelectModel<typeof roomParticipants>;
export type AIConversation = InferSelectModel<typeof aiConversations>;
export type AIMessage = InferSelectModel<typeof aiMessages>;

// Insert Types (for creating new records)
export type NewUser = InferInsertModel<typeof users>;
export type NewOauthProvider = InferInsertModel<typeof oauthProviders>;
export type NewPost = InferInsertModel<typeof posts>;
export type NewComment = InferInsertModel<typeof comments>;
export type NewChatRoom = InferInsertModel<typeof chatRooms>;
export type NewChatMessage = InferInsertModel<typeof chatMessages>;
export type NewRoomParticipant = InferInsertModel<typeof roomParticipants>;
export type NewAIConversation = InferInsertModel<typeof aiConversations>;
export type NewAIMessage = InferInsertModel<typeof aiMessages>;

/* ------------------ AUTHENTICATION TYPES ------------------ */

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface JWTPayload {
  id: number;
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/* ------------------ API RESPONSE TYPES ------------------ */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

export interface PaginatedResponse<T = any> extends ApiResponse<{ items: T[]; pagination: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
} }> {}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/* ------------------ CHAT TYPES ------------------ */

export interface ChatRoomWithParticipants extends ChatRoom {
  participants: (RoomParticipant & { user: Pick<User, 'id' | 'username' | 'avatar'> })[];
  creator?: Pick<User, 'id' | 'username' | 'avatar'>;
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Pick<User, 'id' | 'username' | 'avatar'>;
  replyTo?: Pick<ChatMessage, 'id' | 'content'>;
}

export interface RoomParticipantWithUser extends RoomParticipant {
  user: Pick<User, 'id' | 'username' | 'avatar' | 'isActive'>;
}

/* ------------------ AI TYPES ------------------ */

export interface AIConversationWithMessages extends AIConversation {
  messages: AIMessage[];
  user: Pick<User, 'id' | 'username'>;
}

export interface AIResponse {
  response: string;
  tokens: number;
  metadata?: Record<string, any>;
}

export interface AIAnalysisResult {
  type: 'sentiment' | 'keywords' | 'topics' | 'readability';
  result: Record<string, any>;
  confidence?: number;
}

export interface CodeAnalysis {
  explanation?: string;
  review?: {
    issues: string[];
    suggestions: string[];
    rating: number;
  };
  language?: string;
}

/* ------------------ POST TYPES ------------------ */

export interface PostWithAuthor extends Post {
  author: Pick<User, 'id' | 'username' | 'avatar' | 'firstName' | 'lastName'>;
  comments?: CommentWithAuthor[];
  _count?: {
    comments: number;
    likes: number;
  };
}

export interface CommentWithAuthor extends Comment {
  author: Pick<User, 'id' | 'username' | 'avatar' | 'firstName' | 'lastName'>;
  replies?: CommentWithAuthor[];
  post?: Pick<Post, 'id' | 'title' | 'slug'>;
}

/* ------------------ UTILITY TYPES ------------------ */

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface QueryParams extends PaginationParams, SortParams, FilterParams {}

/* ------------------ OAUTH TYPES ------------------ */

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email?: string;
  name?: string;
  avatar?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: Date;
}

export interface OAuthProviderWithUser extends OauthProvider {
  user: Pick<User, 'id' | 'username' | 'email'>;
}

/* ------------------ FILE UPLOAD TYPES ------------------ */

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
  url?: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: number;
}

/* ------------------ RATE LIMITING TYPES ------------------ */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

/* ------------------ SEARCH TYPES ------------------ */

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  query: string;
  filters?: Record<string, any>;
  facets?: Record<string, any>;
}

export interface SearchParams {
  q: string;
  filters?: Record<string, any>;
  sort?: string;
  page?: number;
  limit?: number;
}

/* ------------------ NOTIFICATION TYPES ------------------ */

export interface Notification {
  id: string;
  userId: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

/* ------------------ WEBSOCKET TYPES ------------------ */

export interface SocketUser extends AuthUser {
  socketId: string;
  rooms: string[];
  lastSeen: Date;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  from?: number;
  to?: number | string;
}

/* ------------------ EMAIL TYPES ------------------ */

export interface EmailTemplate {
  to: string | string[];
  subject: string;
  template: string;
  data?: Record<string, any>;
  from?: string;
  replyTo?: string;
}

export interface EmailVerification {
  email: string;
  token: string;
  expiresAt: Date;
}

/* ------------------ CACHE TYPES ------------------ */

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serialize?: boolean;
}

export interface CacheResult<T = any> {
  value: T | null;
  hit: boolean;
  ttl?: number;
}

/* ------------------ ERROR TYPES ------------------ */

export interface AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  details?: any;
}

export interface ErrorContext {
  userId?: number;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  body?: any;
  query?: any;
  params?: any;
}

/* ------------------ TYPE GUARDS ------------------ */

export const isAuthenticatedRequest = (req: Request): req is AuthenticatedRequest => {
  return 'user' in req && req.user !== undefined;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};
