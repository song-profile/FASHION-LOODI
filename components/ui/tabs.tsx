"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function SimpleTabs({
  tabs,
  defaultValue,
  onChange,
}: {
  tabs: { value: string; label: string }[];
  defaultValue: string;
  onChange?: (value: string) => void;
}) {
  const [active, setActive] = useState(defaultValue);

  return (
    <div className="inline-flex rounded-2xl bg-soft p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => {
            setActive(tab.value);
            onChange?.(tab.value);
          }}
          className={cn(
            "rounded-xl px-3 py-1.5 text-sm transition",
            active === tab.value ? "bg-white text-primary shadow" : "text-primary/70"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
