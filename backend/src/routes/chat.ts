// src/routes/chat.ts
import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { eq, desc, and } from 'drizzle-orm';
import { authenticateToken, createRateLimiter } from '../middleware/auth';
import { ApiResponse } from '../types';
import db from '../database';
import { chatRooms, chatMessages, roomParticipants, users } from '../database/schema';
import socketService from '../services/socketService';

const chatRouter = Router();

// Rate limiting
const chatRateLimit = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Get user's chat rooms
chatRouter.get('/rooms',
  authenticateToken,
  chatRateLimit,
  async (req: Request, res: Response<ApiResponse<{ rooms: any[] }>>) => {
    try {
      const userRooms = await db.select({
        id: chatRooms.id,
        name: chatRooms.name,
        description: chatRooms.description,
        type: chatRooms.type,
        participantCount: chatRooms.maxParticipants,
        createdAt: chatRooms.createdAt,
        updatedAt: chatRooms.updatedAt,
      })
        .from(chatRooms)
        .innerJoin(roomParticipants, eq(chatRooms.id, roomParticipants.roomId))
        .where(and(
          eq(roomParticipants.userId, req.user!.id),
          eq(roomParticipants.isActive, true),
          eq(chatRooms.isActive, true)
        ))
        .orderBy(desc(chatRooms.updatedAt));

      res.json({
        success: true,
        data: { rooms: userRooms }
      });

    } catch (error) {
      console.error('Get chat rooms error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Create chat room
chatRouter.post('/rooms',
  authenticateToken,
  chatRateLimit,
  [
    body('name').isLength({ min: 1, max: 255 }).withMessage('Room name must be 1-255 characters'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be max 1000 characters'),
    body('type').optional().isIn(['public', 'private']).withMessage('Type must be public or private'),
  ],
  async (req: Request, res: Response<ApiResponse<{ room: any }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, description, type = 'public',maxParticipants } = req.body;

      const participantsLimit = maxParticipants ?? 50;  // use 50 if undefined/null

      // Create room
      const [newRoom] = await db.insert(chatRooms)
        .values({
          name,
          description,
          type,
          createdBy: req.user!.id,
          isActive: true,
          maxParticipants: participantsLimit,
          settings: {},
        })
        .returning();

      // Add creator as participant
      await db.insert(roomParticipants)
        .values({
          userId: req.user!.id,
          roomId: newRoom.id,
          role: 'admin',
          joinedAt: new Date(),
          isActive: true,
        });

      res.status(201).json({
        success: true,
        message: 'Chat room created successfully',
        data: { room: newRoom }
      });

    } catch (error) {
      console.error('Create chat room error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Join chat room
chatRouter.post('/rooms/:id/join',
  authenticateToken,
  chatRateLimit,
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      const roomId = parseInt(req.params.id);
      if (isNaN(roomId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID'
        });
      }

      // Check if room exists and is active
      const [room] = await db.select()
        .from(chatRooms)
        .where(and(eq(chatRooms.id, roomId), eq(chatRooms.isActive, true)))
        .limit(1);

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Check if already a participant
      const [existingParticipant] = await db.select()
        .from(roomParticipants)
        .where(and(
          eq(roomParticipants.userId, req.user!.id),
          eq(roomParticipants.roomId, roomId)
        ))
        .limit(1);

      if (existingParticipant) {
        // Reactivate if inactive
        if (!existingParticipant.isActive) {
          await db.update(roomParticipants)
            .set({ isActive: true, joinedAt: new Date() })
            .where(and(
              eq(roomParticipants.userId, req.user!.id),
              eq(roomParticipants.roomId, roomId)
            ));
        }

        return res.json({
          success: true,
          message: 'Successfully joined the room'
        });
      }

      // Check room capacity
      const [{ count }] = await db.select({ count: roomParticipants.id })
        .from(roomParticipants)
        .where(and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.isActive, true)
        ));

      if (count >= room.maxParticipants!) {
        return res.status(400).json({
          success: false,
          message: 'Room is at maximum capacity'
        });
      }

      // Add participant
      await db.insert(roomParticipants)
        .values({
          userId: req.user!.id,
          roomId: roomId,
          role: 'member',
          joinedAt: new Date(),
          isActive: true,
        });

      res.json({
        success: true,
        message: 'Successfully joined the room'
      });

    } catch (error) {
      console.error('Join room error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Leave chat room
chatRouter.post('/rooms/:id/leave',
  authenticateToken,
  chatRateLimit,
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      const roomId = parseInt(req.params.id);
      if (isNaN(roomId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID'
        });
      }

      await db.update(roomParticipants)
        .set({ isActive: false })
        .where(and(
          eq(roomParticipants.userId, req.user!.id),
          eq(roomParticipants.roomId, roomId)
        ));

      res.json({
        success: true,
        message: 'Successfully left the room'
      });

    } catch (error) {
      console.error('Leave room error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Get room messages
chatRouter.get('/rooms/:id/messages',
  authenticateToken,
  chatRateLimit,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  ],
  async (req: Request, res: Response<ApiResponse<{ messages: any[] }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const roomId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (isNaN(roomId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID'
        });
      }

      // Check if user is participant
      const [participant] = await db.select()
        .from(roomParticipants)
        .where(and(
          eq(roomParticipants.userId, req.user!.id),
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.isActive, true)
        ))
        .limit(1);

      if (!participant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this room'
        });
      }

      // Get messages with sender info
      const messages = await db.select({
        id: chatMessages.id,
        content: chatMessages.content,
        type: chatMessages.type,
        metadata: chatMessages.metadata,
        isEdited: chatMessages.isEdited,
        createdAt: chatMessages.createdAt,
        sender: {
          id: users.id,
          username: users.username,
          avatar: users.avatar,
        }
      })
        .from(chatMessages)
        .innerJoin(users, eq(chatMessages.senderId, users.id))
        .where(and(
          eq(chatMessages.roomId, roomId),
          eq(chatMessages.isDeleted, false)
        ))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({
        success: true,
        data: { messages: messages.reverse() } // Reverse to show oldest first
      });

    } catch (error) {
      console.error('Get room messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export { chatRouter as default };
