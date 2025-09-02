// src/services/aiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { eq, desc, and } from 'drizzle-orm';
import db from '../database';
import { aiConversations, aiMessages } from '../database/schema';
import { CacheService } from '../config/redis';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
  metadata?: any;
}

export interface ConversationHistory {
  id: number;
  messages: AIMessage[];
  totalTokens: number;
  messageCount: number;
}

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  // Create a new conversation
  async createConversation(userId: number, title?: string): Promise<number> {
    try {
      const [conversation] = await db.insert(aiConversations)
        .values({
          userId,
          title: title || 'New Conversation',
          model: 'gemini-2.0-flash',
          totalTokens: 0,
          messageCount: 0,
          isActive: true,
          settings: {},
        })
        .returning({ id: aiConversations.id });

      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  // Get conversation history
  async getConversationHistory(conversationId: number, userId: number): Promise<ConversationHistory | null> {
    try {
      // Check cache first
      const cacheKey = `conversation:${conversationId}:${userId}`;
      const cached = await CacheService.get<ConversationHistory>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get conversation
      const [conversation] = await db.select()
        .from(aiConversations)
        .where(and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId),
          eq(aiConversations.isActive, true)
        ))
        .limit(1);

      if (!conversation) {
        return null;
      }

      // Get messages
      const messages = await db.select()
        .from(aiMessages)
        .where(eq(aiMessages.conversationId, conversationId))
        .orderBy(aiMessages.createdAt);

      const history: ConversationHistory = {
        id: conversation.id,
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          tokens: msg.tokens || undefined,
          metadata: msg.metadata || undefined,
        })),
        totalTokens: conversation.totalTokens || 0, // Fixed: Handle null values
        messageCount: conversation.messageCount || 0, // Fixed: Handle null values
      };

      // Cache for 5 minutes
      await CacheService.set(cacheKey, history, 300);

      return history;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw new Error('Failed to get conversation history');
    }
  }

  // Send message to AI and get response
  async sendMessage(
    conversationId: number,
    userId: number,
    userMessage: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      includeHistory?: boolean;
    }
  ): Promise<{ response: string; tokens: number }> {
    try {
      // Verify conversation belongs to user
      const conversation = await db.select()
        .from(aiConversations)
        .where(and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId),
          eq(aiConversations.isActive, true)
        ))
        .limit(1);

      if (!conversation.length) {
        throw new Error('Conversation not found or access denied');
      }

      // Save user message
      await db.insert(aiMessages)
        .values({
          conversationId,
          role: 'user',
          content: userMessage,
          tokens: this.estimateTokens(userMessage),
        });

      // Prepare conversation history if requested
      let chatHistory = '';
      if (options?.includeHistory !== false) {
        const history = await this.getConversationHistory(conversationId, userId);
        if (history && history.messages.length > 1) {
          // Get last 10 messages for context
          const recentMessages = history.messages.slice(-10, -1); // Exclude the current message
          chatHistory = recentMessages
            .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
            .join('\n\n');
        }
      }

      // Prepare prompt with context
      const prompt = chatHistory 
        ? `Previous conversation:\n${chatHistory}\n\nHuman: ${userMessage}\n\nAssistant:`
        : userMessage;

      // Generate AI response
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();
      
      // Estimate tokens (Gemini doesn't provide exact token counts)
      const responseTokens = this.estimateTokens(responseText);
      const userTokens = this.estimateTokens(userMessage);
      const totalTokens = userTokens + responseTokens;

      // Save AI response
      await db.insert(aiMessages)
        .values({
          conversationId,
          role: 'assistant',
          content: responseText,
          tokens: responseTokens,
          metadata: {
            model: 'gemini-2.0-flash',
            promptTokens: userTokens,
            completionTokens: responseTokens,
            totalTokens,
          },
        });

      const currentConv = conversation[0];
      // Update conversation stats - Fixed: Handle null values
      await db.update(aiConversations)
        .set({
          totalTokens: (currentConv.totalTokens || 0) + totalTokens,
          messageCount: (currentConv.messageCount || 0) + 2, // user + assistant
          updatedAt: new Date(),
        })
        .where(eq(aiConversations.id, conversationId));

      // Clear cache
      const cacheKey = `conversation:${conversationId}:${userId}`;
      await CacheService.del(cacheKey);

      return {
        response: responseText,
        tokens: totalTokens,
      };

    } catch (error) {
      console.error('Error sending AI message:', error);
      throw new Error('Failed to get AI response');
    }
  }

  // Get user's conversations
  async getUserConversations(userId: number, limit = 20, offset = 0) {
    try {
      const conversations = await db.select({
        id: aiConversations.id,
        title: aiConversations.title,
        model: aiConversations.model,
        totalTokens: aiConversations.totalTokens,
        messageCount: aiConversations.messageCount,
        createdAt: aiConversations.createdAt,
        updatedAt: aiConversations.updatedAt,
      })
        .from(aiConversations)
        .where(and(
          eq(aiConversations.userId, userId),
          eq(aiConversations.isActive, true)
        ))
        .orderBy(desc(aiConversations.updatedAt))
        .limit(limit)
        .offset(offset);

      return conversations;
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw new Error('Failed to get conversations');
    }
  }

  // Update conversation title
  async updateConversationTitle(conversationId: number, userId: number, title: string): Promise<boolean> {
    try {
      const result = await db.update(aiConversations)
        .set({ title, updatedAt: new Date() })
        .where(and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        ));

      // Clear cache
      const cacheKey = `conversation:${conversationId}:${userId}`;
      await CacheService.del(cacheKey);

      return true;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      return false;
    }
  }

  // Delete conversation
  async deleteConversation(conversationId: number, userId: number): Promise<boolean> {
    try {
      await db.update(aiConversations)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        ));

      // Clear cache
      const cacheKey = `conversation:${conversationId}:${userId}`;
      await CacheService.del(cacheKey);

      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  // Generate conversation title from first message
  async generateConversationTitle(firstMessage: string): Promise<string> {
    try {
      const prompt = `Generate a short, descriptive title (max 5 words) for a conversation that starts with: "${firstMessage.substring(0, 100)}..."`;
      
      const result = await this.model.generateContent(prompt);
      const title = result.response.text().replace(/['"]/g, '').trim();
      
      return title.length > 50 ? title.substring(0, 47) + '...' : title;
    } catch (error) {
      console.error('Error generating title:', error);
      return 'New Conversation';
    }
  }

  // Estimate token count (rough approximation)
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  // Text processing utilities
  async summarizeText(text: string): Promise<string> {
    try {
      const prompt = `Please provide a concise summary of the following text:\n\n${text}`;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw new Error('Failed to summarize text');
    }
  }

  async analyzeText(text: string, analysisType: 'sentiment' | 'keywords' | 'topics' | 'readability'): Promise<any> {
    try {
      let prompt = '';
      switch (analysisType) {
        case 'sentiment':
          prompt = `Analyze the sentiment of this text and provide a JSON response with sentiment (positive/negative/neutral) and confidence score (0-1):\n\n${text}`;
          break;
        case 'keywords':
          prompt = `Extract the main keywords and key phrases from this text and return them as a JSON array:\n\n${text}`;
          break;
        case 'topics':
          prompt = `Identify the main topics discussed in this text and return them as a JSON array:\n\n${text}`;
          break;
        case 'readability':
          prompt = `Analyze the readability of this text and provide a JSON response with readability level, complexity score, and suggestions for improvement:\n\n${text}`;
          break;
      }

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Try to parse as JSON, fallback to plain text
      try {
        return JSON.parse(response);
      } catch {
        return { result: response };
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      throw new Error('Failed to analyze text');
    }
  }

  // Code-related AI functions
  async explainCode(code: string, language?: string): Promise<string> {
    try {
      const prompt = `Please explain what this ${language || ''} code does:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error explaining code:', error);
      throw new Error('Failed to explain code');
    }
  }

  async reviewCode(code: string, language?: string): Promise<string> {
    try {
      const prompt = `Please review this ${language || ''} code and provide suggestions for improvement, potential bugs, and best practices:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error reviewing code:', error);
      throw new Error('Failed to review code');
    }
  }

  // Creative writing helpers
  async generateContent(prompt: string, contentType: 'blog' | 'email' | 'social' | 'creative'): Promise<string> {
    try {
      let enhancedPrompt = '';
      switch (contentType) {
        case 'blog':
          enhancedPrompt = `Write a well-structured blog post about: ${prompt}. Include an engaging introduction, main content with subheadings, and a conclusion.`;
          break;
        case 'email':
          enhancedPrompt = `Write a professional email about: ${prompt}. Make it clear, concise, and appropriately formal.`;
          break;
        case 'social':
          enhancedPrompt = `Create an engaging social media post about: ${prompt}. Make it attention-grabbing and shareable.`;
          break;
        case 'creative':
          enhancedPrompt = `Write creative content about: ${prompt}. Be imaginative and engaging.`;
          break;
      }

      const result = await this.model.generateContent(enhancedPrompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Failed to generate content');
    }
  }
}

export default new AIService();
