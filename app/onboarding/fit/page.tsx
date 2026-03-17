"use client";

import Link from "next/link";
import { useState } from "react";
import { OnboardingProgress } from "@/components/sections/onboarding-progress";
import { Button } from "@/components/ui/button";
import { fitOptions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function FitOnboardingPage() {
  const [selected, setSelected] = useState("Regular");

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-6 px-4 py-8">
      <OnboardingProgress step={3} />
      <div>
        <h1 className="text-2xl font-semibold text-primary">Fit Preference</h1>
        <p className="text-sm text-primary/70">Choose your preferred fit.</p>
      </div>

      <div className="space-y-3">
        {fitOptions.map((fit) => (
          <button
            key={fit}
            onClick={() => setSelected(fit)}
            className={cn(
              "w-full rounded-2xl border border-border p-4 text-left text-sm font-medium",
              selected === fit ? "bg-primary text-white" : "bg-white text-primary"
            )}
          >
            {fit}
          </button>
        ))}
      </div>

      <Link href="/onboarding/result">
        <Button className="w-full">See My Style Profile</Button>
      </Link>
    </main>
  );
}
