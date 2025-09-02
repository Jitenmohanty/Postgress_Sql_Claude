'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Bot, 
  Plus, 
  MessageSquare, 
  Clock, 
  Trash2,
  Share,
  Star,
  Code,
  FileText,
  Lightbulb
} from 'lucide-react';
import Link from 'next/link';

interface AIConversation {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string;
  createdAt: Date;
  category: 'code' | 'debug' | 'explain' | 'general';
}

const conversationCategories = {
  code: { icon: Code, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  debug: { icon: Lightbulb, color: 'text-orange-600', bg: 'bg-orange-500/10' },
  explain: { icon: FileText, color: 'text-green-600', bg: 'bg-green-500/10' },
  general: { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-500/10' },
};

export default function AIPage() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);

  useEffect(() => {
    // Fetch AI conversations from API
    const mockConversations: AIConversation[] = [
      {
        id: '1',
        title: 'React Performance Optimization',
        messageCount: 15,
        lastMessage: 'Here are the best practices for optimizing React performance...',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        category: 'code',
      },
      {
        id: '2',
        title: 'Debugging TypeScript Errors',
        messageCount: 8,
        lastMessage: 'The error occurs because the type inference...',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        category: 'debug',
      },
      {
        id: '3',
        title: 'Explain Async/Await',
        messageCount: 12,
        lastMessage: 'Async/await is syntactic sugar over Promises...',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        category: 'explain',
      },
      {
        id: '4',
        title: 'Best Practices for API Design',
        messageCount: 20,
        lastMessage: 'RESTful APIs should follow these conventions...',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
        category: 'general',
      },
    ];
    setConversations(mockConversations);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Bot className="mr-3 h-8 w-8 text-primary" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Get help with coding, debugging, and learning new technologies
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/ai/chat">
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Link>
        </Button>
      </motion.div>

      {/* Quick Start Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {Object.entries(conversationCategories).map(([key, category]) => (
          <Card key={key} className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
            <Link href={`/ai/chat?template=${key}`}>
              <CardHeader className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-lg ${category.bg} p-2.5 mb-2 group-hover:scale-110 transition-transform`}>
                  <category.icon className={`h-full w-full ${category.color}`} />
                </div>
                <CardTitle className="text-sm capitalize">{key} Help</CardTitle>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </motion.div>

      {/* Conversation History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Your chat history with the AI assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversations.map((conversation, index) => {
                const category = conversationCategories[conversation.category];
                return (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Link href={`/ai/conversations/${conversation.id}`}>
                      <div className="flex items-center space-x-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className={`w-10 h-10 rounded-lg ${category.bg} p-2 flex-shrink-0`}>
                          <category.icon className={`h-full w-full ${category.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium truncate">{conversation.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {conversation.messageCount} messages
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              {conversation.createdAt.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm">
                            <Share className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Star className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}