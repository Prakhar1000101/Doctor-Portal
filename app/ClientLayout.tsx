'use client';

import { Inter } from 'next/font/google';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/ui/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <body className={inter.className}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <Header />
        <main className="min-h-screen">{children}</main>
        {!isDashboard && <Footer />}
      </ThemeProvider>
    </body>
  );
}