"use client";

import Link from "next/link";
import { useState } from "react";
import { OnboardingProgress } from "@/components/sections/onboarding-progress";
import { Button } from "@/components/ui/button";
import { colorOptions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function ColorOnboardingPage() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (name: string) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]));
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-6 px-4 py-8">
      <OnboardingProgress step={2} />
      <div>
        <h1 className="text-2xl font-semibold text-primary">Color Preference</h1>
        <p className="text-sm text-primary/70">Pick colors you wear often.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {colorOptions.map((color) => (
          <button
            key={color.name}
            onClick={() => toggle(color.name)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-border p-4 text-left",
              selected.includes(color.name) && "ring-2 ring-accent"
            )}
          >
            <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: color.hex }} />
            <span className="text-sm font-medium text-primary">{color.name}</span>
          </button>
        ))}
      </div>

      <Link href="/onboarding/fit">
        <Button className="w-full">Next</Button>
      </Link>
    </main>
  );
}
