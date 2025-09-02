import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DevHub - The Ultimate Developer Platform',
  description: 'Build, learn, and collaborate with developers worldwide. Featuring AI-powered assistance, real-time chat, and comprehensive project management.',
  keywords: 'developer, platform, coding, AI, chat, projects, collaboration',
  authors: [{ name: 'DevHub Team' }],
  openGraph: {
    title: 'DevHub - The Ultimate Developer Platform',
    description: 'Build, learn, and collaborate with developers worldwide.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'bg-card text-card-foreground border',
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}