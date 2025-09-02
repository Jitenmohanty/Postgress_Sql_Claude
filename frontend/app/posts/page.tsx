'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Plus, 
  Heart, 
  MessageCircle, 
  Eye, 
  Clock,
  TrendingUp,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { Post } from '@/lib/types';

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    // Fetch posts from API
    const mockPosts: Post[] = [
      {
        id: '1',
        title: 'Building a Real-time Chat App with Socket.IO and React',
        slug: 'building-realtime-chat-app',
        content: 'Learn how to build a production-ready chat application...',
        excerpt: 'A comprehensive guide to building real-time applications with modern web technologies.',
        tags: ['React', 'Socket.IO', 'Node.js', 'TypeScript'],
        author: {
          id: '1',
          email: 'john@example.com',
          username: 'john_dev',
          displayName: 'John Developer',
          avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
          joinedAt: new Date(),
          isOnline: true,
          lastActive: new Date(),
          followersCount: 256,
          followingCount: 89,
          postsCount: 12,
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
        viewsCount: 1234,
        likesCount: 45,
        commentsCount: 12,
        isPublished: true,
      },
      {
        id: '2',
        title: 'Advanced TypeScript Patterns for Better Code',
        slug: 'advanced-typescript-patterns',
        content: 'Explore advanced TypeScript patterns and techniques...',
        excerpt: 'Deep dive into advanced TypeScript features that will make your code more robust and maintainable.',
        tags: ['TypeScript', 'Design Patterns', 'Best Practices'],
        author: {
          id: '2',
          email: 'sarah@example.com',
          username: 'sarah_ts',
          displayName: 'Sarah TypeScript',
          avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
          joinedAt: new Date(),
          isOnline: false,
          lastActive: new Date(Date.now() - 1000 * 60 * 30),
          followersCount: 189,
          followingCount: 156,
          postsCount: 8,
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
        viewsCount: 2156,
        likesCount: 78,
        commentsCount: 23,
        isPublished: true,
      },
      {
        id: '3',
        title: 'Next.js 15 Performance Optimization Guide',
        slug: 'nextjs-15-performance-guide',
        content: 'Learn how to optimize your Next.js applications...',
        excerpt: 'Complete guide to optimizing Next.js 15 applications for maximum performance and user experience.',
        tags: ['Next.js', 'Performance', 'React', 'Web Development'],
        author: {
          id: '3',
          email: 'mike@example.com',
          username: 'mike_next',
          displayName: 'Mike Next',
          avatar: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
          joinedAt: new Date(),
          isOnline: true,
          lastActive: new Date(),
          followersCount: 345,
          followingCount: 234,
          postsCount: 15,
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        viewsCount: 3456,
        likesCount: 123,
        commentsCount: 34,
        isPublished: true,
      },
    ];
    setPosts(mockPosts);
  }, []);

  const allTags = Array.from(new Set(posts.flatMap(post => post.tags)));
  
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Developer Posts</h1>
            <p className="text-muted-foreground">
              Discover insights, tutorials, and discussions from the community
            </p>
          </div>
          <Button asChild>
            <Link href="/posts/create">
              <Plus className="mr-2 h-4 w-4" />
              Write Post
            </Link>
          </Button>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTag === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Button>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Posts Grid */}
        <div className="space-y-6">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300">
                <Link href={`/posts/${post.slug}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                          {post.excerpt}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {post.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={post.author.avatar} alt={post.author.displayName} />
                          <AvatarFallback>
                            {post.author.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{post.author.displayName}</p>
                          <p className="text-xs text-muted-foreground flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {post.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Eye className="mr-1 h-4 w-4" />
                          {post.viewsCount.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <Heart className="mr-1 h-4 w-4" />
                          {post.likesCount}
                        </span>
                        <span className="flex items-center">
                          <MessageCircle className="mr-1 h-4 w-4" />
                          {post.commentsCount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}