"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  ImagePlus,
  Sparkles,
  CalendarDays,
  Flame,
  Trophy,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  diaryPhotoToDataUrl,
  readDiaryEntries,
  type DiaryEntry,
} from "@/lib/outfit-diary";
import { genderToShopping, platformsForGender } from "@/lib/shopping";
import { supabase } from "@/lib/supabase";

type WeatherState =
  | { status: "loading" }
  | {
      status: "success";
      temperature: number;
      icon: string;
      label: string;
      location: string | null;
    }
  | { status: "denied" | "error"; message: string };

function weatherFromCode(code: number) {
  if (code === 0) return { icon: "☀️", label: "Sunny" };
  if (code <= 3) return { icon: "☁️", label: "Cloudy" };
  if ([45, 48].includes(code)) return { icon: "🌫️", label: "Foggy" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icon: "🌧️", label: "Rainy" };
  }
  if (code >= 71 && code <= 77) return { icon: "❄️", label: "Snowy" };
  if (code >= 95) return { icon: "⛈️", label: "Stormy" };
  return { icon: "🌤️", label: "Weather" };
}

function normalizeLocationName(value: string) {
  const normalized = value
    .replace("서울특별시", "서울시")
    .replace("부산광역시", "부산시")
    .replace("대구광역시", "대구시")
    .replace("인천광역시", "인천시")
    .replace("광주광역시", "광주시")
    .replace("대전광역시", "대전시")
    .replace("울산광역시", "울산시");

  if (normalized === "세종특별자치시") return "세종시";
  return normalized;
}

function cleanLocationPart(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = normalizeLocationName(value.trim());
  if (!cleaned || cleaned === "대한민국" || cleaned === "South Korea") return null;
  return cleaned;
}

function compactLocationParts(parts: Array<string | null>) {
  const cleaned = parts.filter((part): part is string => Boolean(part));
  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 2).join(" ") || null;
}

function locationLabelFromData(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    city?: unknown;
    locality?: unknown;
    principalSubdivision?: unknown;
    localityInfo?: {
      administrative?: Array<{
        name?: unknown;
        description?: unknown;
        adminLevel?: unknown;
      }>;
    };
  };

  const administrative = record.localityInfo?.administrative ?? [];
  const administrativeNames = administrative
    .map((item) => cleanLocationPart(item.name))
    .filter((part): part is string => Boolean(part));

  const city =
    cleanLocationPart(record.city) ??
    administrativeNames.find((name) => /(시|군)$/.test(name)) ??
    cleanLocationPart(record.principalSubdivision) ??
    null;
  const district =
    cleanLocationPart(record.locality) ??
    administrativeNames.find((name) => /(구|동|읍|면)$/.test(name)) ??
    null;

  return compactLocationParts([city, district]);
}

function locationLabelFromOsm(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    address?: Record<string, unknown>;
  };
  const address = record.address;
  if (!address) return null;

  const city =
    cleanLocationPart(address.city) ??
    cleanLocationPart(address.town) ??
    cleanLocationPart(address.county) ??
    cleanLocationPart(address.state);
  const district =
    cleanLocationPart(address.borough) ??
    cleanLocationPart(address.suburb) ??
    cleanLocationPart(address.neighbourhood) ??
    cleanLocationPart(address.quarter);

  return compactLocationParts([city, district]);
}

async function fetchLocationLabel(latitude: number, longitude: number) {
  try {
    const locationParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "ko",
    });
    const locationResponse = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${locationParams.toString()}`,
    );

    if (locationResponse.ok) {
      const label = locationLabelFromData(await locationResponse.json());
      if (label) return label;
    }
  } catch {
    // Try the OpenStreetMap fallback below.
  }

  try {
    const osmParams = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "16",
      addressdetails: "1",
      "accept-language": "ko",
    });
    const osmResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${osmParams.toString()}`,
    );

    if (osmResponse.ok) {
      return locationLabelFromOsm(await osmResponse.json());
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchWeatherForCoordinates(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "weather_code,temperature_2m",
    timezone: "auto",
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );

  if (!response.ok) throw new Error("weather fetch failed");

  const data = await response.json();
  const temperature = Number(data?.current?.temperature_2m);
  const code = Number(data?.current?.weather_code ?? 1);
  if (!Number.isFinite(temperature)) throw new Error("invalid weather data");
  const condition = weatherFromCode(code);
  const location = await fetchLocationLabel(latitude, longitude);

  return {
    status: "success" as const,
    temperature,
    location,
    ...condition,
  };
}

async function fetchApproximateCoordinates() {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) throw new Error("location fallback failed");

  const data = await response.json();
  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("invalid fallback coordinates");
  }

  const location =
    cleanLocationPart(data?.city) ??
    cleanLocationPart(data?.region) ??
    null;

  return { latitude, longitude, location };
}

type RecommendItem = {
  category: string;
  name: string;
  searchKeyword: string;
};

const RECOMMENDATION_CACHE_KEY = "loodi_today_outfit_recommendation";
const RECOMMENDATION_CATEGORY_ORDER: Record<string, number> = {
  아우터: 0,
  상의: 1,
  원피스: 2,
  하의: 3,
  신발: 4,
  가방: 5,
  액세서리: 6,
  모자: 7,
};

type RecommendationState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      reasoning: string;
      colors: string[];
      items: RecommendItem[];
      createdAt: number;
    }
  | { status: "error"; message: string };

function recommendationErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted")
  ) {
    return "AI 추천 서버가 잠시 바쁩니다. 잠깐 후 다시 시도해 주세요.";
  }

  if (message.includes("{") || message.includes("Recommendation failed")) {
    return "오늘 코디 추천을 불러오지 못했어요. 다시 시도해 주세요.";
  }

  return message || "추천을 불러오지 못했어요.";
}

function todayDateKey() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sortRecommendationItems(items: RecommendItem[]) {
  return [...items].sort((a, b) => {
    const aOrder = RECOMMENDATION_CATEGORY_ORDER[a.category] ?? 99;
    const bOrder = RECOMMENDATION_CATEGORY_ORDER[b.category] ?? 99;
    return aOrder - bOrder;
  });
}

function formatRelativeTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "방금 전";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function readCachedRecommendation(): RecommendationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RECOMMENDATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      date?: string;
      reasoning?: unknown;
      colors?: unknown;
      items?: unknown;
      createdAt?: unknown;
    };
    if (parsed.date !== todayDateKey()) return null;
    if (
      typeof parsed.reasoning !== "string" ||
      !Array.isArray(parsed.colors) ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }

    return {
      status: "success",
      reasoning: parsed.reasoning,
      colors: parsed.colors.filter((color): color is string => typeof color === "string"),
      createdAt:
        typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
          ? parsed.createdAt
          : Date.now(),
      items: sortRecommendationItems(
        parsed.items.filter((item): item is RecommendItem => {
          if (!item || typeof item !== "object") return false;
          const value = item as Partial<RecommendItem>;
          return (
            typeof value.category === "string" &&
            typeof value.name === "string" &&
            typeof value.searchKeyword === "string"
          );
        }),
      ),
    };
  } catch {
    return null;
  }
}

function writeCachedRecommendation(recommendation: Extract<RecommendationState, { status: "success" }>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    RECOMMENDATION_CACHE_KEY,
    JSON.stringify({
      date: todayDateKey(),
      createdAt: recommendation.createdAt,
      reasoning: recommendation.reasoning,
      colors: recommendation.colors,
      items: recommendation.items,
    }),
  );
}

export default function HomeTabPage() {
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [gender, setGender] = useState<string>("선택 안 함");
  const [recommendation, setRecommendation] = useState<RecommendationState>({
    status: "idle",
  });

  useEffect(() => {
    const loadApproximateWeather = async () => {
      try {
        const { latitude, longitude, location } = await fetchApproximateCoordinates();
        const approximateWeather = await fetchWeatherForCoordinates(latitude, longitude);
        setWeather({
          ...approximateWeather,
          location: approximateWeather.location ?? location,
        });
      } catch {
        setWeather({
          status: "error",
          message: "Weather: 위치 권한을 허용하면 더 정확히 잡을 수 있어요",
        });
      }
    };

    if (!navigator.geolocation) {
      loadApproximateWeather();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setWeather(await fetchWeatherForCoordinates(latitude, longitude));
        } catch {
          setWeather({
            status: "error",
            message: "Weather: 날씨를 불러오지 못했어요",
          });
        }
      },
      () => {
        loadApproximateWeather();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    const loadRecentEntries = () => {
      setRecentEntries(readDiaryEntries().filter((entry) => entry.photos[0]).slice(0, 3));
    };

    loadRecentEntries();
    window.addEventListener("focus", loadRecentEntries);
    return () => window.removeEventListener("focus", loadRecentEntries);
  }, []);

  useEffect(() => {
    const loadGender = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const value = data.user?.user_metadata?.gender;
        if (typeof value === "string" && value.trim().length > 0) {
          setGender(value);
        }
      } catch {
        // ignore: stay with default "선택 안 함"
      }
    };
    loadGender();
  }, []);

  useEffect(() => {
    const cached = readCachedRecommendation();
    if (cached) setRecommendation(cached);
  }, []);

  const fetchRecommendation = useCallback(async () => {
    setRecommendation({ status: "loading" });
    try {
      const all = readDiaryEntries();
      const todayKey = todayDateKey();

      const todayEntry = all.find((entry) => entry.date === todayKey && entry.photos[0]);
      const recent = all
        .filter((entry) => entry.date !== todayKey)
        .slice(0, 10)
        .map((entry) => ({
          date: entry.date,
          colors: entry.colors,
          items: entry.items,
          styleNote: entry.styleNote,
          mood: entry.mood,
          weather: entry.weather,
        }));

      const weatherPayload =
        weather.status === "success"
          ? { label: weather.label, temperature: weather.temperature }
          : null;

      const todayPhoto = todayEntry?.photos[0]
        ? {
            base64: todayEntry.photos[0].base64,
            mediaType: todayEntry.photos[0].mediaType,
          }
        : null;

      const response = await fetch("/api/recommend-outfit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gender,
          weather: weatherPayload,
          recentEntries: recent,
          todayPhoto,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? `요청 실패 (${response.status})`);
      }

      const data = (await response.json()) as {
        reasoning: string;
        recommendedColors: string[];
        recommendedItems: RecommendItem[];
      };

      const nextRecommendation: RecommendationState = {
        status: "success",
        reasoning: data.reasoning,
        colors: data.recommendedColors,
        items: sortRecommendationItems(data.recommendedItems),
        createdAt: Date.now(),
      };
      setRecommendation(nextRecommendation);
      writeCachedRecommendation(nextRecommendation);
    } catch (err) {
      const message = recommendationErrorMessage(
        err instanceof Error ? err.message : "추천을 불러오지 못했어요.",
      );
      setRecommendation({ status: "error", message });
    }
  }, [gender, weather]);

  useEffect(() => {
    if (weather.status === "loading") return;
    if (recommendation.status !== "idle") return;
    const cached = readCachedRecommendation();
    if (cached) {
      setRecommendation(cached);
      return;
    }
    fetchRecommendation();
  }, [weather.status, recommendation.status, fetchRecommendation]);

  const shoppingGender = genderToShopping(gender);
  const shoppingPlatforms = platformsForGender(shoppingGender);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-medium text-primary/60">LOODI</p>
        <h1 className="text-2xl font-semibold text-primary">Record → Insight → Reward</h1>
        <div className="flex gap-2">
          <Badge className="gap-1"><Flame size={12} /> 3 Day Style Streak</Badge>
          <Badge className="gap-1"><Trophy size={12} /> Level 3</Badge>
        </div>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Today Outfit Recommendation</CardTitle>
          <button
            type="button"
            onClick={fetchRecommendation}
            disabled={recommendation.status === "loading"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-primary/60 hover:text-primary disabled:opacity-50"
            aria-label="다시 추천 받기"
          >
            <RefreshCw
              size={14}
              className={recommendation.status === "loading" ? "animate-spin" : ""}
            />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-primary/70">
            {weather.status === "loading"
              ? "Weather: 현재 위치 확인 중..."
              : weather.status === "success"
                ? `Weather: ${Math.round(weather.temperature)}°C ${weather.icon}${
                    weather.location ? ` · ${weather.location}` : ""
                  }`
                : weather.message}
          </p>

          {recommendation.status === "loading" || recommendation.status === "idle" ? (
            <div className="rounded-2xl bg-soft p-4 text-sm text-primary/70">
              오늘 어울릴 코디를 분석 중...
            </div>
          ) : recommendation.status === "error" ? (
            <div className="rounded-2xl bg-soft p-4 text-sm text-primary/70">
              <p>{recommendation.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={fetchRecommendation}
              >
                다시 시도
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-soft p-4 text-sm text-primary">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">왜 이 코디?</p>
                  <p className="shrink-0 text-xs text-primary/45">
                    {formatRelativeTime(recommendation.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-primary/75">{recommendation.reasoning}</p>
                {recommendation.colors.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {recommendation.colors.map((color) => (
                      <Badge key={color} className="bg-white text-[11px]">
                        {color}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                {recommendation.items.map((item, idx) => (
                  <div
                    key={`${item.category}-${idx}`}
                    className="rounded-2xl border border-border bg-white px-4 py-3"
                  >
                    <p className="text-[11px] font-medium text-primary/55">
                      {item.category}
                    </p>
                    <p className="truncate text-sm font-medium text-primary">
                      {item.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shoppingPlatforms.map((platform) => (
                        <a
                          key={platform.id}
                          href={platform.buildUrl(item.searchKeyword, shoppingGender)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-accent hover:text-white"
                        >
                          {platform.label}
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/record"><Button className="w-full">Record Today</Button></Link>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="gap-2"><Camera size={16} /> Camera</Button>
            <Button variant="outline" className="gap-2"><ImagePlus size={16} /> Gallery</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Style Insight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl bg-soft p-4 text-sm">
            <p className="text-primary/60">Last 7 Days</p>
            <p className="font-medium text-primary">Urban Minimal ↑</p>
          </div>
          <Link href="/dna"><Button variant="outline" className="w-full gap-2"><Sparkles size={16} /> View Style DNA</Button></Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Outfits</CardTitle>
          <Link href="/timeline" className="text-xs text-accent">View Timeline</Link>
        </CardHeader>
        <CardContent>
          {recentEntries.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {recentEntries.map((entry) => {
                const photo = entry.photos[0];
                return (
                  <Link
                    key={entry.id}
                    href="/timeline"
                    className="relative h-24 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={diaryPhotoToDataUrl(photo)}
                      alt={entry.title ?? `outfit ${entry.date}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-primary/55">
              아직 기록한 사진이 없어요. Record에서 첫 룩을 저장해 보세요.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-soft">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium text-primary">Reminder</p>
            <p className="text-xs text-primary/70">Did you record your outfit today?</p>
          </div>
          <CalendarDays size={18} className="text-accent" />
        </CardContent>
      </Card>
    </div>
  );
}
