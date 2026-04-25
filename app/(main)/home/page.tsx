"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, ImagePlus, Sparkles, CalendarDays, Flame, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  diaryPhotoToDataUrl,
  readDiaryEntries,
  type DiaryEntry,
} from "@/lib/outfit-diary";

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
  return value
    .replace("서울특별시", "서울시")
    .replace("부산광역시", "부산시")
    .replace("대구광역시", "대구시")
    .replace("인천광역시", "인천시")
    .replace("광주광역시", "광주시")
    .replace("대전광역시", "대전시")
    .replace("울산광역시", "울산시")
    .replace("세종특별자치시", "세종시");
}

function locationLabelFromData(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    city?: unknown;
    locality?: unknown;
    principalSubdivision?: unknown;
  };
  const city =
    typeof record.city === "string" && record.city.length > 0
      ? record.city
      : typeof record.principalSubdivision === "string"
        ? record.principalSubdivision
        : null;
  const district =
    typeof record.locality === "string" && record.locality.length > 0
      ? record.locality
      : null;

  const parts = [city, district]
    .filter((part): part is string => Boolean(part))
    .map(normalizeLocationName);
  const uniqueParts = Array.from(new Set(parts));

  return uniqueParts.length > 0 ? uniqueParts.join(" ") : null;
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
  const condition = weatherFromCode(code);
  let location: string | null = null;

  try {
    const locationParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "ko",
    });
    const locationResponse = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${locationParams.toString()}`
    );

    if (locationResponse.ok) {
      location = locationLabelFromData(await locationResponse.json());
    }
  } catch {
    location = null;
  }

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

  return { latitude, longitude };
}

export default function HomeTabPage() {
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const loadApproximateWeather = async () => {
      try {
        const { latitude, longitude } = await fetchApproximateCoordinates();
        setWeather(await fetchWeatherForCoordinates(latitude, longitude));
      } catch {
        setWeather({
          status: "error",
          message: "Weather: 현재 위치를 찾지 못했어요",
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
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
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
        <CardHeader>
          <CardTitle>Today Outfit Recommendation</CardTitle>
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
          <div className="rounded-2xl bg-soft p-4 text-sm text-primary">
            <p className="font-medium">Recommended Outfit</p>
            <p>Coat · Wide Pants · Boots</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary">Try This Outfit</Button>
            <Button variant="outline">Save Outfit</Button>
          </div>
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
