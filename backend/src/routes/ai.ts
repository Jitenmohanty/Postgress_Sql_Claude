// src/routes/ai.ts
import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticateToken, createRateLimiter } from '../middleware/auth';
import { ApiResponse } from '../types';
import aiService from '../services/aiService';

const router = Router();

// Rate limiting for AI endpoints
const aiRateLimit = createRateLimiter(60 * 1000, 10); // 10 requests per minute
const heavyAIRateLimit = createRateLimiter(60 * 1000, 3); // 3 requests per minute for heavy operations

// Validation rules
const sendMessageValidation = [
  body('message').isLength({ min: 1, max: 4000 }).withMessage('Message must be 1-4000 characters'),
  body('conversationId').optional().isInt().withMessage('Conversation ID must be an integer'),
  body('includeHistory').optional().isBoolean().withMessage('Include history must be boolean'),
];

const createConversationValidation = [
  body('title').optional().isLength({ min: 1, max: 255 }).withMessage('Title must be 1-255 characters'),
];

// Create a new conversation
router.post('/conversations', 
  authenticateToken, 
  aiRateLimit,
  createConversationValidation,
  async (req: Request, res: Response<ApiResponse<{ conversationId: number }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { title } = req.body;
      const conversationId = await aiService.createConversation(req.user!.id, title);

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: { conversationId }
      });

    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation'
      });
    }
  }
);

// Get user's conversations
router.get('/conversations',
  authenticateToken,
  aiRateLimit,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  ],
  async (req: Request, res: Response<ApiResponse<{ conversations: any[] }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const conversations = await aiService.getUserConversations(req.user!.id, limit, offset);

      res.json({
        success: true,
        data: { conversations }
      });

    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversations'
      });
    }
  }
);

// Get conversation history
router.get('/conversations/:id',
  authenticateToken,
  aiRateLimit,
  async (req: Request, res: Response<ApiResponse<{ conversation: any }>>) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID'
        });
      }

      const conversation = await aiService.getConversationHistory(conversationId, req.user!.id);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        data: { conversation }
      });

    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get conversation'
      });
    }
  }
);

// Send message to AI
router.post('/conversations/:id/messages',
  authenticateToken,
  aiRateLimit,
  sendMessageValidation,
  async (req: Request, res: Response<ApiResponse<{ response: string; tokens: number }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID'
        });
      }

      const { message, includeHistory = true } = req.body;

      const result = await aiService.sendMessage(
        conversationId,
        req.user!.id,
        message,
        { includeHistory }
      );

      res.json({
        success: true,
        message: 'Message sent successfully',
        data: {
          response: result.response,
          tokens: result.tokens
        }
      });

    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send message'
      });
    }
  }
);

// Update conversation title
router.patch('/conversations/:id',
  authenticateToken,
  aiRateLimit,
  [body('title').isLength({ min: 1, max: 255 }).withMessage('Title must be 1-255 characters')],
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID'
        });
      }

      const { title } = req.body;
      const success = await aiService.updateConversationTitle(conversationId, req.user!.id, title);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or update failed'
        });
      }

      res.json({
        success: true,
        message: 'Conversation updated successfully'
      });

    } catch (error) {
      console.error('Update conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update conversation'
      });
    }
  }
);

// Delete conversation
router.delete('/conversations/:id',
  authenticateToken,
  aiRateLimit,
  async (req: Request, res: Response<ApiResponse>) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid conversation ID'
        });
      }

      const success = await aiService.deleteConversation(conversationId, req.user!.id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or deletion failed'
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });

    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete conversation'
      });
    }
  }
);

// Quick AI chat (without saving to conversation)
router.post('/chat',
  authenticateToken,
  aiRateLimit,
  [body('message').isLength({ min: 1, max: 4000 }).withMessage('Message must be 1-4000 characters')],
  async (req: Request, res: Response<ApiResponse<{ response: string; tokens: number }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { message } = req.body;

      // Create temporary conversation for quick chat
      const conversationId = await aiService.createConversation(req.user!.id, 'Quick Chat');
      const result = await aiService.sendMessage(conversationId, req.user!.id, message, { includeHistory: false });

      res.json({
        success: true,
        message: 'Chat response generated',
        data: {
          response: result.response,
          tokens: result.tokens
        }
      });

    } catch (error) {
      console.error('Quick chat error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chat response'
      });
    }
  }
);

// Text analysis endpoints
router.post('/analyze/text',
  authenticateToken,
  heavyAIRateLimit,
  [
    body('text').isLength({ min: 10, max: 10000 }).withMessage('Text must be 10-10000 characters'),
    body('type').isIn(['sentiment', 'keywords', 'topics', 'readability']).withMessage('Invalid analysis type'),
  ],
  async (req: Request, res: Response<ApiResponse<{ analysis: any }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { text, type } = req.body;
      const result = await aiService.analyzeText(text, type);

      res.json({
        success: true,
        message: 'Text analysis completed',
        data: { analysis: result }
      });

    } catch (error) {
      console.error('Text analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze text'
      });
    }
  }
);

// Text summarization
router.post('/summarize',
  authenticateToken,
  heavyAIRateLimit,
  [body('text').isLength({ min: 100, max: 20000 }).withMessage('Text must be 100-20000 characters')],
  async (req: Request, res: Response<ApiResponse<{ summary: string }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { text } = req.body;
      const summary = await aiService.summarizeText(text);

      res.json({
        success: true,
        message: 'Text summarized successfully',
        data: { summary }
      });

    } catch (error) {
      console.error('Summarization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to summarize text'
      });
    }
  }
);

// Code explanation
router.post('/code/explain',
  authenticateToken,
  heavyAIRateLimit,
  [
    body('code').isLength({ min: 10, max: 10000 }).withMessage('Code must be 10-10000 characters'),
    body('language').optional().isLength({ min: 1, max: 50 }).withMessage('Language must be 1-50 characters'),
  ],
  async (req: Request, res: Response<ApiResponse<{ explanation: string }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { code, language } = req.body;
      const explanation = await aiService.explainCode(code, language);

      res.json({
        success: true,
        message: 'Code explanation generated',
        data: { explanation }
      });

    } catch (error) {
      console.error('Code explanation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to explain code'
      });
    }
  }
);

// Code review
router.post('/code/review',
  authenticateToken,
  heavyAIRateLimit,
  [
    body('code').isLength({ min: 10, max: 10000 }).withMessage('Code must be 10-10000 characters'),
    body('language').optional().isLength({ min: 1, max: 50 }).withMessage('Language must be 1-50 characters'),
  ],
  async (req: Request, res: Response<ApiResponse<{ review: string }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { code, language } = req.body;
      const review = await aiService.reviewCode(code, language);

      res.json({
        success: true,
        message: 'Code review completed',
        data: { review }
      });

    } catch (error) {
      console.error('Code review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to review code'
      });
    }
  }
);

// Content generation
router.post('/generate/content',
  authenticateToken,
  heavyAIRateLimit,
  [
    body('prompt').isLength({ min: 10, max: 1000 }).withMessage('Prompt must be 10-1000 characters'),
    body('type').isIn(['blog', 'email', 'social', 'creative']).withMessage('Invalid content type'),
  ],
  async (req: Request, res: Response<ApiResponse<{ content: string }>>) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { prompt, type } = req.body;
      const content = await aiService.generateContent(prompt, type);

      res.json({
        success: true,
        message: 'Content generated successfully',
        data: { content }
      });

    } catch (error) {
      console.error('Content generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate content'
      });
    }
  }
);

export default router;
