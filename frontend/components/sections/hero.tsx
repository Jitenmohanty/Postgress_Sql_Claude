'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Code2, MessageSquare, Bot, Users } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-teal-500/10" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-30 animate-pulse" />
              <Code2 className="relative h-16 w-16 text-primary" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-purple-600 to-blue-600 bg-clip-text text-transparent"
          >
            The Ultimate
            <br />
            Developer Platform
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            Build, learn, and collaborate with developers worldwide. Featuring AI-powered assistance, 
            real-time chat, and comprehensive project management.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <Button size="lg" asChild className="group">
              <Link href="/register">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/posts">Explore Posts</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto"
          >
            <div className="text-center">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg p-4 mb-2">
                <Code2 className="h-6 w-6 mx-auto text-purple-600" />
              </div>
              <p className="text-sm font-medium">Code Editor</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4 mb-2">
                <MessageSquare className="h-6 w-6 mx-auto text-blue-600" />
              </div>
              <p className="text-sm font-medium">Real-time Chat</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 rounded-lg p-4 mb-2">
                <Bot className="h-6 w-6 mx-auto text-teal-600" />
              </div>
              <p className="text-sm font-medium">AI Assistant</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-4 mb-2">
                <Users className="h-6 w-6 mx-auto text-orange-600" />
              </div>
              <p className="text-sm font-medium">Community</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}