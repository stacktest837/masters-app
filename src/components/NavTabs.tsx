'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/pick', label: 'My Picks' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/admin', label: 'Admin' },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex mt-5" role="tablist">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              'flex-1 text-center text-sm py-2.5 border-b-2 transition-all duration-200 font-medium',
              active
                ? 'border-masters-gold text-masters-gold'
                : 'border-white/10 text-white/50 hover:text-white/80 hover:border-white/30'
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
