import type { Metadata, Viewport } from 'next';
import './globals.css';
import NavTabs from '@/components/NavTabs';

export const metadata: Metadata = {
  title: 'Masters Pool 2026',
  description: 'Golf pick\'em pool — Masters Tournament, April 9–12',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-masters-surface min-h-screen font-sans antialiased">
        {/* Hero header */}
        <header className="hero-gradient text-white">
          <div className="max-w-lg mx-auto px-5 pt-8 pb-0">
            {/* Logo */}
            <div className="text-center">
              <p className="text-masters-gold/70 text-[10px] font-semibold tracking-[0.25em] uppercase mb-2">
                2026 · Augusta National
              </p>
              <h1 className="font-serif text-2xl font-bold text-masters-gold tracking-wide">
                Masters Pool
              </h1>
              <p className="text-white/40 text-xs mt-1">April 9–12</p>
            </div>
            {/* Tab nav */}
            <NavTabs />
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
