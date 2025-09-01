// src/database/schema.ts
import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/* ------------------ USERS ------------------ */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    password: varchar('password', { length: 255 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    avatar: varchar('avatar', { length: 500 }),
    isEmailVerified: boolean('is_email_verified').default(false),
    isActive: boolean('is_active').default(true),
    role: varchar('role', { length: 20 }).default('user'),
    refreshToken: text('refresh_token'),
    emailVerificationToken: varchar('email_verification_token', { length: 255 }),
    passwordResetToken: varchar('password_reset_token', { length: 255 }),
    passwordResetExpires: timestamp('password_reset_expires'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex('email_idx').on(table.email),
    usernameIdx: uniqueIndex('username_idx').on(table.username),
    roleIdx: index('role_idx').on(table.role),
  })
);

/* ------------------ OAUTH PROVIDERS ------------------ */
export const oauthProviders = pgTable(
  'oauth_providers',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    name: varchar('name', { length: 255 }),
    avatar: varchar('avatar', { length: 500 }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpires: timestamp('token_expires'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    providerIdx: index('provider_idx').on(table.provider),
    providerIdIdx: uniqueIndex('provider_id_idx').on(table.provider, table.providerId),
  })
);

/* ------------------ POSTS ------------------ */
export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    excerpt: varchar('excerpt', { length: 500 }),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    authorId: integer('author_id').references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('draft'),
    featuredImage: varchar('featured_image', { length: 500 }),
    tags: jsonb('tags').$type<string[]>(),
    metadata: jsonb('metadata'),
    viewCount: integer('view_count').default(0),
    likeCount: integer('like_count').default(0),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('slug_idx').on(table.slug),
    authorIdx: index('author_idx').on(table.authorId),
    statusIdx: index('status_idx').on(table.status),
    publishedAtIdx: index('published_at_idx').on(table.publishedAt),
  })
);

/* ------------------ COMMENTS ------------------ */
export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    authorId: integer('author_id').references(() => users.id, { onDelete: 'cascade' }),
    postId: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id'),
    isApproved: boolean('is_approved').default(false),
    likeCount: integer('like_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    postIdx: index('comment_post_idx').on(table.postId),
    authorIdx: index('comment_author_idx').on(table.authorId),
    parentIdx: index('parent_idx').on(table.parentId),
  })
);

/* ------------------ CHAT ROOMS ------------------ */
export const chatRooms = pgTable(
  'chat_rooms',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 20 }).default('public'),
    createdBy: integer('created_by').references(() => users.id),
    isActive: boolean('is_active').default(true),
    maxParticipants: integer('max_participants').default(100),
    settings: jsonb('settings'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    typeIdx: index('room_type_idx').on(table.type),
    createdByIdx: index('room_created_by_idx').on(table.createdBy),
  })
);

/* ------------------ CHAT MESSAGES ------------------ */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: serial('id').primaryKey(),
    content: text('content').notNull(),
    type: varchar('type', { length: 20 }).default('text'),
    senderId: integer('sender_id').references(() => users.id),
    roomId: integer('room_id').references(() => chatRooms.id, { onDelete: 'cascade' }),
    replyToId: integer('reply_to_id'),
    metadata: jsonb('metadata'),
    isEdited: boolean('is_edited').default(false),
    isDeleted: boolean('is_deleted').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    roomIdx: index('message_room_idx').on(table.roomId),
    senderIdx: index('message_sender_idx').on(table.senderId),
    createdAtIdx: index('message_created_at_idx').on(table.createdAt),
  })
);

/* ------------------ ROOM PARTICIPANTS ------------------ */
export const roomParticipants = pgTable(
  'room_participants',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    roomId: integer('room_id').references(() => chatRooms.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).default('member'),
    joinedAt: timestamp('joined_at').defaultNow(),
    lastSeenAt: timestamp('last_seen_at'),
    isActive: boolean('is_active').default(true),
  },
  (table) => ({
    userRoomIdx: uniqueIndex('user_room_idx').on(table.userId, table.roomId),
    roomIdx: index('participant_room_idx').on(table.roomId),
  })
);

/* ------------------ AI CONVERSATIONS ------------------ */
export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    model: varchar('model', { length: 50 }).default('gemini-pro'),
    totalTokens: integer('total_tokens').default(0),
    messageCount: integer('message_count').default(0),
    isActive: boolean('is_active').default(true),
    settings: jsonb('settings'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdx: index('ai_conv_user_idx').on(table.userId),
    createdAtIdx: index('ai_conv_created_at_idx').on(table.createdAt),
  })
);

/* ------------------ AI MESSAGES ------------------ */
export const aiMessages = pgTable(
  'ai_messages',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id').references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(),
    content: text('content').notNull(),
    tokens: integer('tokens'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    conversationIdx: index('ai_msg_conversation_idx').on(table.conversationId),
    createdAtIdx: index('ai_msg_created_at_idx').on(table.createdAt),
  })
);

/* ------------------ RELATIONS ------------------ */
export const userRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  oauthProviders: many(oauthProviders),
  chatMessages: many(chatMessages),
  roomParticipants: many(roomParticipants),
  aiConversations: many(aiConversations),
}));

export const postRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  comments: many(comments),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  parent: one(comments, { fields: [comments.parentId], references: [comments.id] }),
  replies: many(comments),
}));

export const chatRoomRelations = relations(chatRooms, ({ one, many }) => ({
  creator: one(users, { fields: [chatRooms.createdBy], references: [users.id] }),
  messages: many(chatMessages),
  participants: many(roomParticipants),
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  room: one(chatRooms, { fields: [chatMessages.roomId], references: [chatRooms.id] }),
  replyTo: one(chatMessages, { fields: [chatMessages.replyToId], references: [chatMessages.id] }),
}));

export const aiConversationRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
  messages: many(aiMessages),
}));

export const aiMessageRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiMessages.conversationId], references: [aiConversations.id] }),
}));
