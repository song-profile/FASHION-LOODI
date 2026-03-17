"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const generatedTags = {
  items: ["Jacket", "Wide Pants", "Sneakers"],
  colors: ["Black", "Grey"],
};

export default function RecordPage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">Record Outfit</h1>

      <Card>
        <CardHeader>
          <CardTitle>Step {step} / 3</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-primary/70">Photo Upload</p>
              <div className="grid grid-cols-2 gap-2">
                <Button>Take Photo</Button>
                <Button variant="outline">Upload Photo</Button>
              </div>
              <Button variant="secondary" className="w-full" onClick={() => setStep(2)}>
                Next: AI Tagging
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-primary/70">AI analyzing...</p>
              <div className="rounded-2xl bg-soft p-4 text-sm text-primary">
                <p className="font-medium">Items</p>
                <p>{generatedTags.items.join(", ")}</p>
                <p className="mt-2 font-medium">Colors</p>
                <p>{generatedTags.colors.join(", ")}</p>
              </div>
              <Button variant="outline">Edit Tag</Button>
              <Button variant="secondary" className="w-full" onClick={() => setStep(3)}>
                Next: Context Input
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-primary/70">Weather</p>
                <div className="flex gap-2 text-xl">
                  <button>☀️</button>
                  <button>☁️</button>
                  <button>🌧️</button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-primary/70">Mood</p>
                <div className="flex gap-2 text-xl">
                  <button>🙂</button>
                  <button>😎</button>
                  <button>😴</button>
                </div>
              </div>

              <Input placeholder="Quick note title" />
              <Textarea placeholder="Notes" />

              <Button
                className="w-full"
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1400);
                }}
              >
                Save Outfit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {saved && (
        <div className="animate-pulse rounded-2xl bg-accent p-4 text-center text-sm font-semibold text-white">
          +1 Style Record
        </div>
      )}
    </div>
  );
}
