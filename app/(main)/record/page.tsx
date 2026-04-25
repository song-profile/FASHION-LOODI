"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { compressImageForUpload } from "@/lib/onboarding-analysis-images";
import { appendDiaryEntry, formatDateKey } from "@/lib/outfit-diary";

type AnalyzedItem = { category: string; name: string };
type Analysis = {
  items: AnalyzedItem[];
  colors: string[];
  style: string[];
  season: string;
  mood: string[];
  description: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function RecordPage() {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Photo too large (max 5MB).");
      return;
    }
    setError(null);
    setAnalysis(null);
    setImageFile(file);
  }

  async function runAnalysis() {
    if (!imageFile) return;
    setAnalyzing(true);
    setError(null);
    setStep(2);
    try {
      const base64 = await fileToBase64(imageFile);
      const res = await fetch("/api/analyze-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: imageFile.type }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data: Analysis = await res.json();
      setAnalysis(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  }

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

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelected}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelected}
              />

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => cameraInputRef.current?.click()}>Take Photo</Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload Photo
                </Button>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!imageFile}
                onClick={runAnalysis}
              >
                Next: AI Tagging
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-primary/70">
                {analyzing ? "AI analyzing..." : error ? error : "AI analysis complete"}
              </p>
              <div className="rounded-2xl bg-soft p-4 text-sm text-primary">
                <p className="font-medium">Items</p>
                <p>{analysis ? analysis.items.map((it) => it.name).join(", ") || "—" : "—"}</p>
                <p className="mt-2 font-medium">Colors</p>
                <p>{analysis ? analysis.colors.join(", ") || "—" : "—"}</p>
              </div>
              <Button variant="outline">Edit Tag</Button>
              <Button
                variant="secondary"
                className="w-full"
                disabled={!analysis || analyzing}
                onClick={() => setStep(3)}
              >
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
                disabled={!imageFile}
                onClick={async () => {
                  if (!imageFile) return;
                  try {
                    const compressed = await compressImageForUpload(imageFile);
                    const tags = analysis
                      ? [
                          analysis.season,
                          ...analysis.style.slice(0, 2),
                          ...analysis.mood.slice(0, 2),
                        ].filter(Boolean)
                      : [];
                    appendDiaryEntry({
                      date: formatDateKey(new Date()),
                      photos: [compressed],
                      styleNote: analysis?.description,
                      tags,
                    });
                  } catch (err) {
                    console.error("Failed to save diary entry", err);
                  }
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
