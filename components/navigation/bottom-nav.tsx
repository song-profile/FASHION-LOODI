"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Sparkles, Shirt, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/timeline", label: "Timeline", icon: CalendarDays },
  { href: "/record", label: "Record", icon: Plus, center: true },
  { href: "/dna", label: "DNA", icon: Sparkles },
  { href: "/closet", label: "Closet", icon: Shirt },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex max-w-md items-end justify-between rounded-3xl border border-border bg-white/95 p-3 shadow-soft backdrop-blur">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="-mt-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg"
              >
                <Icon size={22} />
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("flex flex-col items-center gap-1 px-2", active ? "text-primary" : "text-primary/50")}
            >
              <Icon size={18} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
