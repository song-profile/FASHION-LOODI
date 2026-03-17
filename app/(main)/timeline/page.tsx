"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleTabs } from "@/components/ui/tabs";
import { recentOutfits } from "@/lib/mock-data";

export default function TimelinePage() {
  const [view, setView] = useState("grid");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">Timeline</h1>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <SimpleTabs
            tabs={[
              { value: "calendar", label: "Calendar View" },
              { value: "grid", label: "Grid View" },
            ]}
            defaultValue="grid"
            onChange={setView}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Weather" />
            <Input placeholder="Mood" />
            <Input placeholder="Style" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>March</CardTitle>
        </CardHeader>
        <CardContent>
          {view === "calendar" ? (
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-primary/70">
              {Array.from({ length: 31 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-2">
                  {i + 1}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentOutfits.map((src) => (
                <div key={src} className="relative h-28 overflow-hidden rounded-xl">
                  <Image src={src} alt="timeline outfit" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
