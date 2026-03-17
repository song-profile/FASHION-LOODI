"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { OnboardingProgress } from "@/components/sections/onboarding-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { onboardingStyles } from "@/lib/mock-data";

export default function StyleOnboardingPage() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (name: string) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]));
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-6 px-4 py-8">
      <OnboardingProgress step={1} />
      <div>
        <h1 className="text-2xl font-semibold text-primary">What styles do you like?</h1>
        <p className="text-sm text-primary/70">Select multiple options.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {onboardingStyles.map((style) => {
          const active = selected.includes(style.name);
          return (
            <Card key={style.name} className={cn("overflow-hidden p-2", active && "ring-2 ring-accent")} onClick={() => toggle(style.name)}>
              <div className="relative h-28 overflow-hidden rounded-2xl">
                <Image src={style.image} alt={style.name} fill className="object-cover" />
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="text-sm font-medium">{style.name}</span>
                <span className="text-primary/70">{style.icon}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Link href="/onboarding/color">
        <Button className="w-full">Next</Button>
      </Link>
    </main>
  );
}
