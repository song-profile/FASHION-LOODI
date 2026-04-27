"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
const ANALYSIS_RETRY_DELAYS_MS = [2000, 4000, 6000, 8000, 10000, 12000];
const weatherOptions = ["☀️", "☁️", "🌧️"];
const moodOptions = [
  { icon: "🙂", label: "보통" },
  { icon: "😎", label: "멋짐" },
  { icon: "😴", label: "피곤" },
  { icon: "😊", label: "기쁜" },
  { icon: "😡", label: "화난" },
  { icon: "😢", label: "슬픔" },
];

function isTemporaryAnalysisError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    message.includes("AI 분석 서버가 잠시 바쁩니다") ||
    message.includes("잠시 바쁩니다")
  );
}

function analysisErrorMessage(message: string) {
  if (isTemporaryAnalysisError(message)) {
    return "AI 분석 서버가 잠시 바쁩니다. 잠깐 후 다시 시도해 주세요.";
  }

  if (message.includes("{") || message.includes("Analysis failed")) {
    return "AI 분석을 완료하지 못했어요. 다시 시도해 주세요.";
  }

  return message || "AI 분석을 완료하지 못했어요. 다시 시도해 주세요.";
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function RecordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("분석중입니다. 잠시만 기다려주세요");
  const [error, setError] = useState<string | null>(null);
  const [selectedWeather, setSelectedWeather] = useState(weatherOptions[0]);
  const [selectedMood, setSelectedMood] = useState(moodOptions[0].icon);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const previewUrlRef = useRef<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function updatePreviewUrl(file: File) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextUrl;
    setImagePreviewUrl(nextUrl);
  }

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
    updatePreviewUrl(file);
  }

  async function runAnalysis() {
    if (!imageFile) return;
    setAnalyzing(true);
    setAnalysisStatus("분석중입니다. 잠시만 기다려주세요");
    setError(null);
    setAnalysis(null);
    setStep(2);
    try {
      const analysisImage = await compressImageForUpload(imageFile, 1024, 0.78);

      for (let attempt = 0; attempt <= ANALYSIS_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          if (attempt > 0) {
            setAnalysisStatus(
              `AI 분석 서버가 잠시 바쁩니다. 자동으로 다시 시도 중입니다 (${attempt}/${ANALYSIS_RETRY_DELAYS_MS.length}).`,
            );
          }

          const res = await fetch("/api/analyze-outfit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: analysisImage.base64,
              mediaType: analysisImage.mediaType,
            }),
          });

          if (!res.ok) {
            const errorBody = await res
              .json()
              .catch(() => ({ error: "Analysis failed", retryable: false }));
            const msg = errorBody?.error || `HTTP ${res.status}`;
            const retryable = Boolean(errorBody?.retryable) || isTemporaryAnalysisError(msg);
            if (retryable && attempt < ANALYSIS_RETRY_DELAYS_MS.length) {
              await wait(ANALYSIS_RETRY_DELAYS_MS[attempt]);
              continue;
            }
            throw new Error(msg);
          }

          const data: Analysis = await res.json();
          setAnalysis(data);
          setAnalysisStatus("AI analysis complete");
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Analysis failed";
          if (
            isTemporaryAnalysisError(message) &&
            attempt < ANALYSIS_RETRY_DELAYS_MS.length
          ) {
            await wait(ANALYSIS_RETRY_DELAYS_MS[attempt]);
            continue;
          }
          throw err;
        }
      }
    } catch (err) {
      const msg = analysisErrorMessage(
        err instanceof Error ? err.message : "Analysis failed",
      );
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
              {imagePreviewUrl ? (
                <div className="space-y-2 rounded-2xl border border-border bg-white p-3">
                  <p className="text-sm font-medium text-primary">
                    Selected Photo
                  </p>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-soft">
                    <Image
                      src={imagePreviewUrl}
                      alt="Selected outfit preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <p className="truncate text-xs text-primary/60">
                    {imageFile?.name}
                  </p>
                </div>
              ) : null}
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
                {analyzing
                  ? analysisStatus
                  : error
                    ? error
                    : "AI analysis complete"}
              </p>
              {imagePreviewUrl ? (
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-soft">
                  <Image
                    src={imagePreviewUrl}
                    alt="Selected outfit preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="rounded-2xl bg-soft p-4 text-sm text-primary">
                <p className="font-medium">Items</p>
                <p>
                  {analyzing
                    ? "분석중입니다. 잠시만 기다려주세요"
                    : analysis
                      ? analysis.items.map((it) => it.name).join(", ") ||
                        "분석된 아이템이 없어요"
                      : "분석 결과를 기다리는 중입니다"}
                </p>
                <p className="mt-2 font-medium">Colors</p>
                <p>
                  {analyzing
                    ? "분석중입니다. 잠시만 기다려주세요"
                    : analysis
                      ? analysis.colors.join(", ") || "분석된 색상이 없어요"
                      : "분석 결과를 기다리는 중입니다"}
                </p>
              </div>
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
              {imagePreviewUrl ? (
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-soft">
                  <Image
                    src={imagePreviewUrl}
                    alt="Selected outfit preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm text-primary/70">Weather</p>
                <div className="flex gap-2 text-xl">
                  {weatherOptions.map((weather) => (
                    <button
                      key={weather}
                      type="button"
                      onClick={() => setSelectedWeather(weather)}
                      className={
                        selectedWeather === weather
                          ? "rounded-xl bg-soft px-2 py-1 ring-2 ring-accent"
                          : "rounded-xl px-2 py-1"
                      }
                    >
                      {weather}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-primary/70">Mood</p>
                <div className="flex flex-wrap gap-2">
                  {moodOptions.map((mood) => (
                    <button
                      key={mood.label}
                      type="button"
                      onClick={() => setSelectedMood(mood.icon)}
                      className={
                        selectedMood === mood.icon
                          ? "rounded-xl bg-soft px-3 py-2 text-xl ring-2 ring-accent"
                          : "rounded-xl px-3 py-2 text-xl"
                      }
                      title={mood.label}
                    >
                      {mood.icon}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                placeholder="Quick note title"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
              />
              <Textarea
                placeholder="Notes"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
              />

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
                      title: noteTitle.trim() || "Untitled Outfit",
                      weather: selectedWeather,
                      mood: selectedMood,
                      items: analysis?.items ?? [],
                      colors: analysis?.colors ?? [],
                      styleNote: analysis?.description,
                      memo: noteBody.trim() || undefined,
                      tags,
                    });
                  } catch (err) {
                    console.error("Failed to save diary entry", err);
                  }
                  setSaved(true);
                  setTimeout(() => {
                    setSaved(false);
                    router.push("/timeline");
                  }, 500);
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
