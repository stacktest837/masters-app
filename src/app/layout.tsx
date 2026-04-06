import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Masters Pool 2026',
  description: 'Golf pick\'em pool — Masters Tournament, April 9–12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-masters-cream min-h-screen font-serif">
        <header className="bg-masters-green text-white shadow-md">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-masters-gold leading-tight">Masters Pool 2026</h1>
              <p className="text-green-200 text-xs">April 9–12 · Augusta National</p>
            </div>
            <nav className="flex gap-5 text-sm">
              <a href="/pick" className="text-green-100 hover:text-masters-gold transition-colors">
                My Picks
              </a>
              <a href="/leaderboard" className="text-green-100 hover:text-masters-gold transition-colors">
                Leaderboard
              </a>
              <a href="/admin" className="text-green-100 hover:text-masters-gold transition-colors">
                Admin
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
