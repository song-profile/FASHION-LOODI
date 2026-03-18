"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { OnboardingProgress } from "@/components/sections/onboarding-progress";
import { Button } from "@/components/ui/button";
import { resetAnalysisRetryCount } from "@/lib/onboarding-analysis-session";
import {
  readOnboardingLocalState,
  writeOnboardingLocalState,
} from "@/lib/onboarding-persistence";
import { cn } from "@/lib/utils";

type UploadImage = {
  id: string;
  file: File;
  url: string;
};

const MAX_PHOTOS = 5;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

const emotionTags = [
  "Confident",
  "Calm",
  "Playful",
  "Polished",
  "Bold",
  "Relaxed",
];

const tpoTags = [
  "Work",
  "Daily",
  "Date",
  "Travel",
  "Workout",
  "Event",
];

function weatherLabelFromCode(code: number, temperature: number) {
  if (code === 0) return `Sunny · ${Math.round(temperature)}°C`;
  if (code <= 3) return `Cloudy · ${Math.round(temperature)}°C`;
  if ([45, 48].includes(code)) return `Foggy · ${Math.round(temperature)}°C`;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return `Rainy · ${Math.round(temperature)}°C`;
  }
  if (code >= 71 && code <= 77) return `Snowy · ${Math.round(temperature)}°C`;
  if (code >= 95) return `Stormy · ${Math.round(temperature)}°C`;
  return `Weather tagged · ${Math.round(temperature)}°C`;
}

export default function OutfitUploadPage() {
  const router = useRouter();
  const [images, setImages] = useState<UploadImage[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [retakeTargetId, setRetakeTargetId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedTpo, setSelectedTpo] = useState<string[]>([]);
  const [memo, setMemo] = useState("");

  const [weatherTag, setWeatherTag] = useState<string | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<
    "idle" | "loading" | "success" | "denied" | "error"
  >("idle");
  const [manualWeatherOpen, setManualWeatherOpen] = useState(false);
  const [manualWeatherInput, setManualWeatherInput] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<UploadImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    const saved = readOnboardingLocalState();
    setSelectedEmotions(saved.upload.emotions);
    setSelectedTpo(saved.upload.tpo);
    setMemo(saved.upload.memo);
    if (saved.upload.weatherTag) {
      setWeatherTag(saved.upload.weatherTag);
      setWeatherStatus("success");
    }
    writeOnboardingLocalState({ lastStep: "upload", completed: false });
    setHydrated(true);
  }, []);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  useEffect(() => {
    const loadWeather = () => {
      if (weatherTag) return;
      if (!navigator.geolocation) {
        setWeatherStatus("denied");
        setManualWeatherOpen(true);
        return;
      }

      setWeatherStatus("loading");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,temperature_2m`
            );
            if (!res.ok) throw new Error("weather fetch failed");
            const data = await res.json();
            const code = Number(data?.current?.weather_code ?? 1);
            const temp = Number(data?.current?.temperature_2m ?? 20);
            setWeatherTag(weatherLabelFromCode(code, temp));
            setWeatherStatus("success");
          } catch {
            setWeatherStatus("error");
            setManualWeatherOpen(true);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setWeatherStatus("denied");
          } else {
            setWeatherStatus("error");
          }
          setManualWeatherOpen(true);
        },
        { timeout: 6000 }
      );
    };

    loadWeather();
  }, [weatherTag]);

  useEffect(() => {
    if (!hydrated) return;
    writeOnboardingLocalState((state) => ({
      ...state,
      lastStep: "upload",
      completed: false,
      upload: {
        photoCount: images.length,
        emotions: selectedEmotions,
        tpo: selectedTpo,
        weatherTag,
        memo,
      },
    }));
  }, [images.length, selectedEmotions, selectedTpo, weatherTag, memo, hydrated]);

  const toggleMulti = (
    value: string,
    current: string[],
    setter: (next: string[]) => void
  ) => {
    setter(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const allFiles = Array.from(fileList);
    const invalidNames = allFiles
      .filter((file) => !ACCEPTED_TYPES.has(file.type))
      .map((file) => file.name);

    if (invalidNames.length > 0) {
      setUploadError(`지원하지 않는 형식: ${invalidNames.join(", ")}`);
    } else {
      setUploadError(null);
    }

    const validFiles = allFiles.filter((file) => ACCEPTED_TYPES.has(file.type));
    if (validFiles.length === 0) return;

    if (retakeTargetId) {
      const nextFile = validFiles[0];
      setImages((prev) =>
        prev.map((item) => {
          if (item.id !== retakeTargetId) return item;
          URL.revokeObjectURL(item.url);
          return {
            id: item.id,
            file: nextFile,
            url: URL.createObjectURL(nextFile),
          };
        })
      );
      setRetakeTargetId(null);
      return;
    }

    const slotsLeft = MAX_PHOTOS - imagesRef.current.length;
    if (slotsLeft <= 0) {
      setUploadError("사진은 최대 5장까지 업로드할 수 있어요.");
      return;
    }

    const selected = validFiles.slice(0, slotsLeft).map((file) => ({
      id: `${file.name}-${crypto.randomUUID()}`,
      file,
      url: URL.createObjectURL(file),
    }));

    if (validFiles.length > slotsLeft) {
      setUploadError("최대 5장까지만 저장되었어요.");
    }

    setImages((prev) => [...prev, ...selected]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
  };

  const openAddSheet = () => {
    setRetakeTargetId(null);
    setIsSheetOpen(true);
  };

  const openRetakeSheet = (id: string) => {
    setRetakeTargetId(id);
    setIsSheetOpen(true);
  };

  const saveManualWeather = () => {
    const normalized = manualWeatherInput.trim();
    if (!normalized) return;
    setWeatherTag(normalized);
    setWeatherStatus("success");
    setManualWeatherOpen(false);
  };

  const handleStartAnalysis = () => {
    if (images.length === 0) return;
    resetAnalysisRetryCount();
    router.push("/onboarding/analysis/loading");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white px-4 pb-36 pt-8">
      <div className="space-y-6">
        <OnboardingProgress step={4} total={5} />

        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            Upload your outfit
          </h1>
          <p className="text-sm leading-relaxed text-primary/70">
            Add 1 to 5 photos for AI analysis. We support JPEG, PNG, HEIC.
          </p>
        </header>

        <section className="space-y-3">
          <button
            type="button"
            onClick={openAddSheet}
            className="flex h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.02] text-center transition hover:border-primary/40"
          >
            <p className="text-base font-medium text-primary">+ Add photos</p>
            <p className="mt-1 text-xs text-primary/60">
              {images.length}/{MAX_PHOTOS} uploaded
            </p>
          </button>

          {uploadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-xs text-rose-700">{uploadError}</p>
              <button
                type="button"
                onClick={openAddSheet}
                className="mt-2 text-xs font-medium text-rose-700 underline underline-offset-4"
              >
                Retry upload
              </button>
            </div>
          ) : null}
        </section>

        {images.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
              Uploaded
            </p>
            <div className="grid grid-cols-3 gap-2">
              {images.map((item) => (
                <article key={item.id} className="space-y-1">
                  <div className="relative overflow-hidden rounded-xl border border-border">
                    <Image
                      src={item.url}
                      alt={item.file.name}
                      width={320}
                      height={320}
                      unoptimized
                      className="h-24 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      className="absolute right-1 top-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white"
                    >
                      Delete
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRetakeSheet(item.id)}
                    className="w-full rounded-lg border border-border px-2 py-1 text-[11px] text-primary/70"
                  >
                    Retake
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Emotion Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {emotionTags.map((tag) => {
              const active = selectedEmotions.includes(tag);
              return (
                <motion.button
                  key={tag}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() =>
                    toggleMulti(tag, selectedEmotions, setSelectedEmotions)
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border text-primary/75"
                  )}
                >
                  {tag}
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            TPO Tags
          </p>
          <div className="flex flex-wrap gap-2">
            {tpoTags.map((tag) => {
              const active = selectedTpo.includes(tag);
              return (
                <motion.button
                  key={tag}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => toggleMulti(tag, selectedTpo, setSelectedTpo)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border text-primary/75"
                  )}
                >
                  {tag}
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-primary">Weather Tag</p>
            {weatherStatus === "loading" ? (
              <span className="text-xs text-primary/60">Detecting...</span>
            ) : null}
          </div>
          {weatherTag ? (
            <p className="text-sm text-primary/75">{weatherTag}</p>
          ) : (
            <p className="text-xs text-primary/60">
              Location not available yet.
            </p>
          )}
          {(weatherStatus === "denied" || weatherStatus === "error") && !weatherTag ? (
            <button
              type="button"
              onClick={() => setManualWeatherOpen(true)}
              className="text-xs text-primary underline underline-offset-4"
            >
              Enter weather manually
            </button>
          ) : null}
        </section>

        <section className="space-y-2">
          <label htmlFor="memo" className="text-xs font-medium uppercase tracking-[0.18em] text-primary/50">
            Memo (Optional)
          </label>
          <input
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={80}
            placeholder="One-line note about this look"
            className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary/35"
          />
        </section>

        <Link href="/onboarding/result" className="text-xs text-primary/55 underline underline-offset-4">
          Skip for now
        </Link>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md space-y-2">
          <Button
            className="h-11 w-full"
            disabled={images.length === 0}
            onClick={handleStartAnalysis}
          >
            AI 분석 시작
          </Button>
          {images.length === 0 ? (
            <p className="text-center text-xs text-primary/55">
              최소 1장의 사진을 업로드해야 분석을 시작할 수 있어요.
            </p>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {isSheetOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close upload options"
              className="fixed inset-0 z-40 bg-black/35"
              onClick={() => setIsSheetOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-4 pb-7 pt-5"
            >
              <div className="mx-auto w-full max-w-md space-y-2">
                <p className="text-sm font-medium text-primary">Add outfit photo</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSheetOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm text-primary"
                >
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSheetOpen(false);
                    galleryInputRef.current?.click();
                  }}
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-border text-sm text-primary"
                >
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setIsSheetOpen(false)}
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-soft text-sm text-primary/80"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {manualWeatherOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close weather fallback modal"
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setManualWeatherOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-4 pb-7 pt-5"
            >
              <div className="mx-auto w-full max-w-md space-y-3">
                <p className="text-sm font-medium text-primary">
                  Set weather manually
                </p>
                <input
                  value={manualWeatherInput}
                  onChange={(e) => setManualWeatherInput(e.target.value)}
                  placeholder="e.g. Cloudy · 18°C"
                  className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary/35"
                />
                <div className="flex flex-wrap gap-2">
                  {["Sunny · 24°C", "Cloudy · 18°C", "Rainy · 13°C"].map(
                    (quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setManualWeatherInput(quick)}
                        className="rounded-full border border-border px-3 py-1 text-xs text-primary/75"
                      >
                        {quick}
                      </button>
                    )
                  )}
                </div>
                <Button
                  className="h-11 w-full"
                  disabled={manualWeatherInput.trim().length === 0}
                  onClick={saveManualWeather}
                >
                  Save weather
                </Button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <input
        ref={cameraInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
        capture="environment"
        className="hidden"
        multiple={retakeTargetId === null}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
        className="hidden"
        multiple={retakeTargetId === null}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </main>
  );
}
