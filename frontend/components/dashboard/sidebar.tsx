'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Bot, 
  Users, 
  Settings, 
  Code2,
  Home,
  Plus,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const sidebarItems = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Activity',
    href: '/dashboard/activity',
    icon: Activity,
  },
  {
    title: 'My Posts',
    href: '/dashboard/posts',
    icon: FileText,
    badge: 'New',
  },
  {
    title: 'Chat Rooms',
    href: '/dashboard/chat',
    icon: MessageSquare,
  },
  {
    title: 'AI Assistant',
    href: '/dashboard/ai',
    icon: Bot,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Following',
    href: '/dashboard/following',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-card/50 backdrop-blur-sm flex flex-col">
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center space-x-2">
          <Code2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            DevHub
          </span>
        </Link>
      </div>

      <div className="flex-1 p-4">
        <div className="mb-6">
          <Button asChild className="w-full justify-start">
            <Link href="/posts/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>

        <nav className="space-y-1">
          {sidebarItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  asChild
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}