// src/services/socketService.ts
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { eq, and, desc } from 'drizzle-orm';
import db from '../database';
import { users, chatRooms, chatMessages, roomParticipants } from '../database/schema';
import { CacheService } from '../config/redis';

export interface SocketUser {
  id: number;
  username: string;
  avatar?: string;
  role: string;
}

export interface ChatMessage {
  id: number;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  senderId: number;
  senderUsername: string;
  senderAvatar?: string;
  roomId: number;
  replyToId?: number;
  metadata?: any;
  createdAt: Date;
}

export interface RoomInfo {
  id: number;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  participantCount: number;
  participants?: SocketUser[];
}

class SocketService {
  private io: Server;
  private connectedUsers = new Map<string, SocketUser>();
  private userRooms = new Map<number, Set<string>>(); // userId -> Set of socketIds

  constructor() {
    // Will be initialized in init method
    this.io = null as any;
  }

  init(server: HTTPServer): Server {
    this.io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('✅ Socket.IO service initialized');
    return this.io;
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Get user info
        const [user] = await db.select({
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          role: users.role,
          isActive: users.isActive,
        })
          .from(users)
          .where(eq(users.id, decoded.id))
          .limit(1);

        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.data.user = {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          role: user.role!,
        };

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user as SocketUser;
      console.log(`👤 User ${user.username} connected (${socket.id})`);

      // Store connected user
      this.connectedUsers.set(socket.id, user);
      
      // Add to user rooms mapping
      if (!this.userRooms.has(user.id)) {
        this.userRooms.set(user.id, new Set());
      }
      this.userRooms.get(user.id)!.add(socket.id);

      // Handle joining rooms
      socket.on('join-room', async (data: { roomId: number }) => {
        try {
          await this.handleJoinRoom(socket, data.roomId);
        } catch (error) {
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Handle leaving rooms
      socket.on('leave-room', async (data: { roomId: number }) => {
        try {
          await this.handleLeaveRoom(socket, data.roomId);
        } catch (error) {
          socket.emit('error', { message: 'Failed to leave room' });
        }
      });

      // Handle sending messages
      socket.on('send-message', async (data: {
        roomId: number;
        content: string;
        type?: 'text' | 'image' | 'file';
        replyToId?: number;
        metadata?: any;
      }) => {
        try {
          await this.handleSendMessage(socket, data);
        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing-start', (data: { roomId: number }) => {
        socket.to(`room:${data.roomId}`).emit('user-typing', {
          userId: user.id,
          username: user.username,
          roomId: data.roomId,
        });
      });

      socket.on('typing-stop', (data: { roomId: number }) => {
        socket.to(`room:${data.roomId}`).emit('user-stop-typing', {
          userId: user.id,
          roomId: data.roomId,
        });
      });

      // Handle message reactions
      socket.on('toggle-reaction', async (data: {
        messageId: number;
        emoji: string;
      }) => {
        try {
          // Implementation for message reactions would go here
          // For now, just broadcast the reaction
          const rooms = Array.from(socket.rooms);
          rooms.forEach(room => {
            if (room.startsWith('room:')) {
              socket.to(room).emit('reaction-updated', {
                messageId: data.messageId,
                emoji: data.emoji,
                userId: user.id,
                username: user.username,
              });
            }
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to toggle reaction' });
        }
      });

      // Handle getting online users in room
      socket.on('get-online-users', async (data: { roomId: number }) => {
        try {
          const onlineUsers = await this.getOnlineUsersInRoom(data.roomId);
          socket.emit('online-users', { roomId: data.roomId, users: onlineUsers });
        } catch (error) {
          socket.emit('error', { message: 'Failed to get online users' });
        }
      });

      // Handle private message
      socket.on('send-private-message', async (data: {
        recipientId: number;
        content: string;
      }) => {
        try {
          await this.handlePrivateMessage(socket, data);
        } catch (error) {
          socket.emit('error', { message: 'Failed to send private message' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`👤 User ${user.username} disconnected (${socket.id}): ${reason}`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.id);
        
        // Remove from user rooms mapping
        const userSocketIds = this.userRooms.get(user.id);
        if (userSocketIds) {
          userSocketIds.delete(socket.id);
          if (userSocketIds.size === 0) {
            this.userRooms.delete(user.id);
          }
        }

        // Notify rooms about user going offline
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('room:')) {
            socket.to(room).emit('user-offline', {
              userId: user.id,
              username: user.username,
            });
          }
        });
      });

      // Send user their info and available rooms
      this.sendUserInfo(socket);
    });
  }

  private async handleJoinRoom(socket: any, roomId: number) {
    const user = socket.data.user as SocketUser;

    // Check if room exists and user has permission
    const [room] = await db.select()
      .from(chatRooms)
      .where(and(eq(chatRooms.id, roomId), eq(chatRooms.isActive, true)))
      .limit(1);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Check if user is already a participant or add them
    const [participant] = await db.select()
      .from(roomParticipants)
      .where(and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, user.id)
      ))
      .limit(1);

    if (!participant && room.type === 'private') {
      socket.emit('error', { message: 'Access denied to private room' });
      return;
    }

    if (!participant) {
      // Add user to room participants
      await db.insert(roomParticipants)
        .values({
          userId: user.id,
          roomId: roomId,
          role: 'member',
          joinedAt: new Date(),
          lastSeenAt: new Date(),
          isActive: true,
        });
    } else {
      // Update last seen
      await db.update(roomParticipants)
        .set({
          lastSeenAt: new Date(),
          isActive: true,
        })
        .where(eq(roomParticipants.id, participant.id));
    }

    // Join socket room
    socket.join(`room:${roomId}`);

    // Get recent messages
    const recentMessages = await this.getRoomMessages(roomId, 50);

    // Get room info
    const roomInfo = await this.getRoomInfo(roomId);

    // Send room data to user
    socket.emit('joined-room', {
      room: roomInfo,
      messages: recentMessages,
    });

    // Notify other users in room
    socket.to(`room:${roomId}`).emit('user-joined', {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      roomId,
    });

    console.log(`👤 ${user.username} joined room ${room.name}`);
  }

  private async handleLeaveRoom(socket: any, roomId: number) {
    const user = socket.data.user as SocketUser;

    // Leave socket room
    socket.leave(`room:${roomId}`);

    // Update participant status
    await db.update(roomParticipants)
      .set({
        lastSeenAt: new Date(),
        isActive: false,
      })
      .where(and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, user.id)
      ));

    // Notify other users
    socket.to(`room:${roomId}`).emit('user-left', {
      userId: user.id,
      username: user.username,
      roomId,
    });

    socket.emit('left-room', { roomId });
  }

  private async handleSendMessage(socket: any, data: {
    roomId: number;
    content: string;
    type?: 'text' | 'image' | 'file';
    replyToId?: number;
    metadata?: any;
  }) {
    const user = socket.data.user as SocketUser;

    // Verify user is in room
    const [participant] = await db.select()
      .from(roomParticipants)
      .where(and(
        eq(roomParticipants.roomId, data.roomId),
        eq(roomParticipants.userId, user.id),
        eq(roomParticipants.isActive, true)
      ))
      .limit(1);

    if (!participant) {
      socket.emit('error', { message: 'You are not a member of this room' });
      return;
    }

    // Save message to database
    const [message] = await db.insert(chatMessages)
      .values({
        content: data.content,
        type: data.type || 'text',
        senderId: user.id,
        roomId: data.roomId,
        replyToId: data.replyToId,
        metadata: data.metadata,
        isEdited: false,
        isDeleted: false,
      })
      .returning();

    // Create chat message object
    const chatMessage: ChatMessage = {
      id: message.id,
      content: message.content,
      type: message.type as any,
      senderId: user.id,
      senderUsername: user.username,
      senderAvatar: user.avatar,
      roomId: data.roomId,
      replyToId: message.replyToId || undefined,
      metadata: message.metadata,
      createdAt: message.createdAt!,
    };

    // Broadcast message to room
    this.io.to(`room:${data.roomId}`).emit('new-message', chatMessage);

    // Cache recent messages
    await this.cacheMessage(data.roomId, chatMessage);

    console.log(`💬 ${user.username} sent message in room ${data.roomId}`);
  }

  private async handlePrivateMessage(socket: any, data: {
    recipientId: number;
    content: string;
  }) {
    const user = socket.data.user as SocketUser;

    // Check if recipient exists
    const [recipient] = await db.select()
      .from(users)
      .where(eq(users.id, data.recipientId))
      .limit(1);

    if (!recipient) {
      socket.emit('error', { message: 'Recipient not found' });
      return;
    }

    // Create or get direct message room
    const roomName = `DM: ${user.username} & ${recipient.username}`;
    
    let [room] = await db.select()
      .from(chatRooms)
      .where(and(
        eq(chatRooms.name, roomName),
        eq(chatRooms.type, 'direct')
      ))
      .limit(1);

    if (!room) {
      // Create new direct message room
      [room] = await db.insert(chatRooms)
        .values({
          name: roomName,
          description: 'Direct message conversation',
          type: 'direct',
          createdBy: user.id,
          isActive: true,
          maxParticipants: 2,
        })
        .returning();

      // Add both users as participants
      await db.insert(roomParticipants)
        .values([
          {
            userId: user.id,
            roomId: room.id,
            role: 'member',
            joinedAt: new Date(),
            isActive: true,
          },
          {
            userId: data.recipientId,
            roomId: room.id,
            role: 'member',
            joinedAt: new Date(),
            isActive: true,
          },
        ]);
    }

    // Send message using regular room message handling
    await this.handleSendMessage(socket, {
      roomId: room.id,
      content: data.content,
      type: 'text',
    });

    // If recipient is online, make them join the room
    const recipientSocketIds = this.userRooms.get(data.recipientId);
    if (recipientSocketIds) {
      recipientSocketIds.forEach(socketId => {
        const recipientSocket = this.io.sockets.sockets.get(socketId);
        if (recipientSocket) {
          recipientSocket.join(`room:${room.id}`);
          recipientSocket.emit('new-dm-room', {
            room: {
              id: room.id,
              name: roomName,
              type: 'direct',
              otherUser: {
                id: user.id,
                username: user.username,
                avatar: user.avatar,
              },
            },
          });
        }
      });
    }
  }

  private async getRoomMessages(roomId: number, limit = 50): Promise<ChatMessage[]> {
    // Try cache first
    const cacheKey = `room:${roomId}:messages`;
    const cached = await CacheService.get<ChatMessage[]>(cacheKey);
    if (cached) {
      return cached.slice(-limit);
    }

    // Get from database
    const messages = await db.select({
      id: chatMessages.id,
      content: chatMessages.content,
      type: chatMessages.type,
      senderId: chatMessages.senderId,
      roomId: chatMessages.roomId,
      replyToId: chatMessages.replyToId,
      metadata: chatMessages.metadata,
      createdAt: chatMessages.createdAt,
      senderUsername: users.username,
      senderAvatar: users.avatar,
    })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(and(
        eq(chatMessages.roomId, roomId),
        eq(chatMessages.isDeleted, false)
      ))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    const chatMessages_: ChatMessage[] = messages.reverse().map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type as any,
      senderId: msg.senderId!,
      senderUsername: msg.senderUsername,
      senderAvatar: msg.senderAvatar ?? undefined,
      roomId: msg.roomId!,
      replyToId: msg.replyToId || undefined,
      metadata: msg.metadata,
      createdAt: msg.createdAt!,
    }));

    // Cache for 5 minutes
    await CacheService.set(cacheKey, chatMessages_, 300);

    return chatMessages_;
  }

  private async getRoomInfo(roomId: number): Promise<RoomInfo> {
    const [room] = await db.select()
      .from(chatRooms)
      .where(eq(chatRooms.id, roomId))
      .limit(1);

    if (!room) {
      throw new Error('Room not found');
    }

    // Get participant count
    const participantCount = await db.select({ count: chatRooms.id })
      .from(roomParticipants)
      .where(and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.isActive, true)
      ));

    return {
      id: room.id,
      name: room.name,
      description: room.description || undefined,
      type: room.type as any,
      participantCount: participantCount.length,
    };
  }

  private async getOnlineUsersInRoom(roomId: number): Promise<SocketUser[]> {
    const roomKey = `room:${roomId}`;
    const socketIds = await this.io.in(roomKey).allSockets();
    
    const onlineUsers: SocketUser[] = [];
    socketIds.forEach(socketId => {
      const user = this.connectedUsers.get(socketId);
      if (user) {
        onlineUsers.push(user);
      }
    });

    return onlineUsers;
  }

  private async cacheMessage(roomId: number, message: ChatMessage) {
    const cacheKey = `room:${roomId}:messages`;
    const cached = await CacheService.get<ChatMessage[]>(cacheKey) || [];
    
    cached.push(message);
    
    // Keep only last 100 messages in cache
    if (cached.length > 100) {
      cached.splice(0, cached.length - 100);
    }

    await CacheService.set(cacheKey, cached, 300);
  }

  private async sendUserInfo(socket: any) {
    const user = socket.data.user as SocketUser;

    // Get user's rooms
    const userRooms = await db.select({
      id: chatRooms.id,
      name: chatRooms.name,
      description: chatRooms.description,
      type: chatRooms.type,
    })
      .from(chatRooms)
      .innerJoin(roomParticipants, eq(chatRooms.id, roomParticipants.roomId))
      .where(and(
        eq(roomParticipants.userId, user.id),
        eq(roomParticipants.isActive, true),
        eq(chatRooms.isActive, true)
      ));

    socket.emit('user-info', {
      user,
      rooms: userRooms,
    });
  }

  // Public methods for external use
  public sendToUser(userId: number, event: string, data: any) {
    const userSocketIds = this.userRooms.get(userId);
    if (userSocketIds) {
      userSocketIds.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });
    }
  }

  public sendToRoom(roomId: number, event: string, data: any) {
    this.io.to(`room:${roomId}`).emit(event, data);
  }

  public getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public getUserConnectionCount(userId: number): number {
    const userSocketIds = this.userRooms.get(userId);
    return userSocketIds ? userSocketIds.size : 0;
  }
}

export default new SocketService();