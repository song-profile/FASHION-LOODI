"use client";

const IMAGES_KEY = "loodi_analysis_pending_images";
const RESULT_KEY = "loodi_analysis_result";
const OUTFIT_PHOTOS_KEY = "loodi_outfit_photos";

export type PendingImage = { base64: string; mediaType: string };

export type AnalyzedItem = { category: string; name: string };

export type SingleAnalysis = {
  items: AnalyzedItem[];
  colors: string[];
  style: string[];
  season: string;
  mood: string[];
  description: string;
};

export type AggregatedAnalysis = {
  perImage: SingleAnalysis[];
  items: AnalyzedItem[];
  colors: string[];
  styles: string[];
  styleCounts: Record<string, number>;
  seasons: string[];
  moods: string[];
  notes: string[];
};

export const SUPPORTED_API_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function fileToBase64(file: File): Promise<string> {
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = src;
  });
}

export async function compressImageForUpload(
  file: File,
  maxLongEdge = 1280,
  quality = 0.85,
): Promise<PendingImage> {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > maxLongEdge) {
    const scale = maxLongEdge / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const compressed = canvas.toDataURL("image/jpeg", quality);
  const idx = compressed.indexOf(",");
  return {
    base64: idx >= 0 ? compressed.slice(idx + 1) : compressed,
    mediaType: "image/jpeg",
  };
}

export function setPendingImages(images: PendingImage[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(IMAGES_KEY, JSON.stringify(images));
  } catch (err) {
    console.error("Failed to persist pending images", err);
  }
}

export function readPendingImages(): PendingImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(IMAGES_KEY);
    return raw ? (JSON.parse(raw) as PendingImage[]) : [];
  } catch {
    return [];
  }
}

export function clearPendingImages() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(IMAGES_KEY);
}

export function setAnalysisResult(result: AggregatedAnalysis) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch (err) {
    console.error("Failed to persist analysis result", err);
  }
}

export function readAnalysisResult(): AggregatedAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as AggregatedAnalysis) : null;
  } catch {
    return null;
  }
}

export function clearAnalysisResult() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(RESULT_KEY);
}

export function setOutfitPhotos(images: PendingImage[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(OUTFIT_PHOTOS_KEY, JSON.stringify(images));
  } catch (err) {
    console.error("Failed to persist outfit photos", err);
  }
}

export function readOutfitPhotos(): PendingImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(OUTFIT_PHOTOS_KEY);
    return raw ? (JSON.parse(raw) as PendingImage[]) : [];
  } catch {
    return [];
  }
}

export function clearOutfitPhotos() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(OUTFIT_PHOTOS_KEY);
}

export function toDataUrl(image: PendingImage): string {
  return `data:${image.mediaType};base64,${image.base64}`;
}

export function aggregate(perImage: SingleAnalysis[]): AggregatedAnalysis {
  const itemMap = new Map<string, AnalyzedItem>();
  const colors = new Set<string>();
  const seasons = new Set<string>();
  const moods = new Set<string>();
  const styleCounts: Record<string, number> = {};

  for (const a of perImage) {
    for (const it of a.items) {
      const key = `${it.category}:${it.name}`;
      if (!itemMap.has(key)) itemMap.set(key, it);
    }
    for (const c of a.colors) colors.add(c);
    for (const s of a.style) styleCounts[s] = (styleCounts[s] ?? 0) + 1;
    if (a.season) seasons.add(a.season);
    for (const m of a.mood) moods.add(m);
  }

  return {
    perImage,
    items: Array.from(itemMap.values()),
    colors: Array.from(colors),
    styles: Object.keys(styleCounts),
    styleCounts,
    seasons: Array.from(seasons),
    moods: Array.from(moods),
    notes: perImage.map((a) => a.description).filter(Boolean),
  };
}
