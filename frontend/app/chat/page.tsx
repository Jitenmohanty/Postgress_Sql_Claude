'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSocket } from '@/components/socket-provider';
import { 
  MessageSquare, 
  Users, 
  Plus, 
  Search, 
  Hash,
  Lock,
  Globe,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  lastMessage?: {
    content: string;
    author: string;
    timestamp: Date;
  };
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { socket, isConnected, onlineUsers } = useSocket();

  useEffect(() => {
    // Fetch chat rooms from API
    const mockRooms: ChatRoom[] = [
      {
        id: '1',
        name: 'react-help',
        description: 'Get help with React development',
        isPrivate: false,
        memberCount: 156,
        lastMessage: {
          content: 'How do I optimize re-renders in React?',
          author: 'john_dev',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
        },
      },
      {
        id: '2',
        name: 'typescript-discussion',
        description: 'Discuss TypeScript best practices',
        isPrivate: false,
        memberCount: 89,
        lastMessage: {
          content: 'Just shipped a new type utility!',
          author: 'sarah_ts',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
        },
      },
      {
        id: '3',
        name: 'next-js-community',
        description: 'Next.js developers unite',
        isPrivate: false,
        memberCount: 234,
        lastMessage: {
          content: 'App Router vs Pages Router comparison',
          author: 'mike_next',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
        },
      },
      {
        id: '4',
        name: 'project-showcase',
        description: 'Share your latest projects',
        isPrivate: false,
        memberCount: 67,
        lastMessage: {
          content: 'Check out my new portfolio site!',
          author: 'emma_ui',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
        },
      },
    ];
    setRooms(mockRooms);
  }, []);

  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Chat Rooms</h1>
          <p className="text-muted-foreground">
            Connect and collaborate with the developer community
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            {onlineUsers.length} online
          </Badge>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Room
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center space-x-4 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chat rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant={isConnected ? 'default' : 'destructive'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
              <Link href={`/chat/rooms/${room.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {room.isPrivate ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {room.memberCount}
                    </Badge>
                  </div>
                  <CardDescription>{room.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {room.lastMessage && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {room.lastMessage.author.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{room.lastMessage.author}</span>
                        <span className="text-muted-foreground flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {new Date(room.lastMessage.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {room.lastMessage.content}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Link>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}