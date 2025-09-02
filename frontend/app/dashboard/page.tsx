'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { 
  FileText, 
  MessageSquare, 
  Bot, 
  Users, 
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: 'Posts', value: '12', icon: FileText, color: 'text-blue-600' },
    { label: 'Views', value: '1.2k', icon: Eye, color: 'text-green-600' },
    { label: 'Likes', value: '89', icon: Heart, color: 'text-red-600' },
    { label: 'Comments', value: '156', icon: MessageCircle, color: 'text-purple-600' },
  ];

  const recentActivity = [
    { type: 'post', title: 'Building a React Hook for API State Management', time: '2 hours ago', engagement: '12 likes' },
    { type: 'comment', title: 'Commented on "Best Practices for TypeScript"', time: '4 hours ago', engagement: '3 replies' },
    { type: 'chat', title: 'Joined #react-help chat room', time: '1 day ago', engagement: '5 participants' },
    { type: 'ai', title: 'AI conversation about performance optimization', time: '2 days ago', engagement: '15 messages' },
  ];

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.displayName} 👋
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening in your developer journey
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, index) => (
          <Card key={stat.label} className="bg-gradient-to-br from-card to-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +12% from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest interactions and contributions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'post' ? 'bg-blue-500' :
                    activity.type === 'comment' ? 'bg-green-500' :
                    activity.type === 'chat' ? 'bg-purple-500' : 'bg-orange-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.time} • {activity.engagement}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump into your most used features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link href="/posts/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Post
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/chat">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Join Chat Room
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/ai/chat">
                  <Bot className="mr-2 h-4 w-4" />
                  Ask AI Assistant
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/users">
                  <Users className="mr-2 h-4 w-4" />
                  Discover Developers
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}