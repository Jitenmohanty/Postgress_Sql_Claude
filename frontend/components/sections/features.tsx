'use client';

import { motion } from 'framer-motion';
import { 
  Code2, 
  MessageSquare, 
  Bot, 
  Users, 
  Zap, 
  Shield,
  Smartphone,
  Palette
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: Code2,
    title: 'Rich Code Editor',
    description: 'Monaco Editor with syntax highlighting, IntelliSense, and live collaboration.',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'Real-time Chat',
    description: 'Instant messaging with threading, reactions, and file sharing capabilities.',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description: 'ChatGPT-powered coding assistant for code review, generation, and debugging.',
    gradient: 'from-teal-500 to-teal-600',
  },
  {
    icon: Users,
    title: 'Developer Community',
    description: 'Connect with developers, share knowledge, and collaborate on projects.',
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized performance with server-side rendering and intelligent caching.',
    gradient: 'from-yellow-500 to-yellow-600',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Enterprise-grade security with OAuth, JWT tokens, and data encryption.',
    gradient: 'from-green-500 to-green-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile Ready',
    description: 'Responsive design that works seamlessly across all devices and screen sizes.',
    gradient: 'from-pink-500 to-pink-600',
  },
  {
    icon: Palette,
    title: 'Beautiful Design',
    description: 'VS Code-inspired interface with customizable themes and smooth animations.',
    gradient: 'from-indigo-500 to-indigo-600',
  },
];

export function Features() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything you need to
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {' '}build amazing things
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform that combines the best tools for modern development
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className={`w-12 h-12 mx-auto rounded-lg bg-gradient-to-br ${feature.gradient} p-2.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-full w-full text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}