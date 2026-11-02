"use client";
import { usePathname } from 'next/navigation';

export function AppScreen({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <div key={path} className="app-screen">{children}</div>;
}
