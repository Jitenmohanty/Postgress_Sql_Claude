'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Star } from 'lucide-react';
import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl blur-3xl" />
            <div className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border rounded-3xl p-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Ready to build the
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {' '}future of development?
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of developers who are already using DevHub to accelerate their development workflow and build amazing projects.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button size="lg" asChild className="group">
                  <Link href="/register">
                    Start Building Today
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="group">
                  <Link href="https://github.com" target="_blank">
                    <Github className="mr-2 h-4 w-4" />
                    View on GitHub
                    <Star className="ml-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-4">Trusted by developers at</p>
                <div className="flex items-center justify-center space-x-8 opacity-60">
                  <div className="text-sm font-medium">Microsoft</div>
                  <div className="text-sm font-medium">Google</div>
                  <div className="text-sm font-medium">Amazon</div>
                  <div className="text-sm font-medium">Netflix</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}