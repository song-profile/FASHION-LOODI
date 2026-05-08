import type { ReactNode } from "react";

import { OnboardingProgress } from "@/components/sections/onboarding-progress";

type OnboardingShellProps = {
  step: number;
  total?: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function OnboardingShell({
  step,
  total = 4,
  title,
  subtitle,
  children,
  footer,
}: OnboardingShellProps) {
  return (
    <main className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#b894b8]/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-[#d8c4d8]/40 blur-3xl" />

      <div className="relative space-y-6">
        <OnboardingProgress step={step} total={total} />

        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary/55">
            Style Survey
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-primary/70">{subtitle}</p>
        </header>

        <section className="space-y-3">{children}</section>

        {footer ? <footer className="pt-2">{footer}</footer> : null}
      </div>
    </main>
  );
}
