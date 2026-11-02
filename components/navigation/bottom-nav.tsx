"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, Sparkles, Shirt, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/home', label: '홈', icon: Home },
  { href: '/timeline', label: '기록', icon: CalendarDays },
  { href: '/record', label: '룩 추가', icon: Plus },
  { href: '/dna', label: '스타일', icon: Sparkles },
  { href: '/closet', label: '옷장', icon: Shirt },
];
export function BottomNav() {
  const pathname = usePathname().replace(/\/$/, '');
  return <nav aria-label="주요 메뉴" className="loodi-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card backdrop-blur-xl">
    <div className="mx-auto grid h-[72px] max-w-md grid-cols-5 px-2">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const add = href === '/record';
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('flex h-[72px] min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors', active ? 'text-accent' : 'text-muted-foreground hover:text-primary')}>
          <span className={cn('flex h-9 w-11 items-center justify-center rounded-2xl transition-colors duration-200', add ? 'bg-accent text-white shadow-sm' : active ? 'bg-accent/10 text-accent' : '')}><Icon size={22} strokeWidth={active ? 2.1 : 1.6} /></span>
          <span>{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
