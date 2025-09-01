// REMOVE THESE LINES (they're now in types/index.ts):
import { InferModel } from 'drizzle-orm';
import {
  users, oauthProviders, posts, comments,
  chatRooms, chatMessages, roomParticipants,
  aiConversations, aiMessages
} from './schema';

// REMOVE ALL OF THESE TYPE EXPORTS:
export type User = InferModel<typeof users>;
export type OauthProvider = InferModel<typeof oauthProviders>;
export type Post = InferModel<typeof posts>;
export type Comment = InferModel<typeof comments>;
export type ChatRoom = InferModel<typeof chatRooms>;
export type ChatMessage = InferModel<typeof chatMessages>;
export type RoomParticipant = InferModel<typeof roomParticipants>;
export type AIConversation = InferModel<typeof aiConversations>;
export type AIMessage = InferModel<typeof aiMessages>;

// REMOVE THESE INSERT TYPES TOO:
export type NewUser = InferModel<typeof users, 'insert'>;
export type NewPost = InferModel<typeof posts, 'insert'>;
export type NewComment = InferModel<typeof comments, 'insert'>;
