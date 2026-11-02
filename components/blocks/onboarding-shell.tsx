import { PageActions } from "@/components/layout/page-actions";
import { BackLink } from "@/components/navigation/back-link";
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
    <main className="relative mx-auto min-h-dvh w-full max-w-md px-5 py-4">
      <div className="relative space-y-5">
        <BackLink href={step === 1 ? "/signup" : step === 2 ? "/onboarding/style" : "/onboarding/color"} />
        <OnboardingProgress step={step} total={total} />

        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary/55">
            나만의 스타일 찾기
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-primary/70">{subtitle}</p>
        </header>

        <section className="space-y-3">{children}</section>

        {footer ? <PageActions>{footer}</PageActions> : null}
      </div>
    </main>
  );
}
