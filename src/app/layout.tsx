import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavTabs from '@/components/NavTabs';
import { createServiceClient } from '@/lib/supabase';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Masters Pool 2026',
  description: 'Golf pick\'em pool — Masters Tournament, April 9–12',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServiceClient();
  const { data: config } = await supabase.from('pool_config').select('picks_locked').single();
  const isLocked = config?.picks_locked ?? false;

  return (
    <html lang="en">
      <body className="bg-masters-surface min-h-screen font-sans antialiased">
        {/* Hero header */}
        <header className="hero-gradient text-white">
          <div className="max-w-lg mx-auto px-5 pt-8 pb-0">
            {/* Logo */}
            <div className="text-center">
              <div className="text-[32px] leading-none mb-2 select-none">⛳</div>
              <h1
                className="font-serif font-bold text-masters-gold tracking-[0.18em] uppercase"
                style={{ fontSize: '20px', letterSpacing: '0.18em' }}
              >
                Masters Pool
              </h1>
              <p className="font-serif text-masters-gold/40 font-normal tracking-[0.35em] mt-1 text-sm">
                2026
              </p>
            </div>
            {/* Tab nav */}
            <NavTabs isLocked={isLocked} />
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-lg mx-auto px-4 pt-5 pb-10">
          {children}
        </main>
      </body>
    </html>
  );
}
