"use client";
import { useWeather } from "@/hooks/use-weather";
import { RecommendItem, RecommendationState, recommendationErrorMessage, todayDateKey, sortRecommendationItems, increment, topStyleEntries, percentageStyleEntries, scoreEntryStyles, dateDaysAgo, diaryDate, formatRelativeTime, readCachedRecommendation, writeCachedRecommendation } from "@/lib/home-insights";
import { ShoppingPlatformMark } from "@/components/home/shopping-platform-mark";

import Image from "next/image";
import Link from "next/link";
import { LinkButton } from "@/components/ui/link-button";
import {
  Sparkles,
  Plus,
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  computeStreakLevel,
  diaryPhotoToDataUrl,
  readDiaryEntries,
  type DiaryEntry,
  type StreakLevel,
} from "@/lib/outfit-diary";
import { genderToShopping, platformsForGender } from "@/lib/shopping";
import { supabase } from "@/lib/supabase";
import { FashionTipsLoader } from "@/components/blocks/fashion-tips-loader";

export default function HomeTabPage() {
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const weather = useWeather();
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [streakLevel, setStreakLevel] = useState<StreakLevel | null>(null);
  const [gender, setGender] = useState<string>("선택 안 함");
  const [recommendation, setRecommendation] = useState<RecommendationState>({
    status: "idle",
  });



  useEffect(() => {
    const loadRecentEntries = () => {
      const all = readDiaryEntries();
      setDiaryEntries(all);
      setRecentEntries(all.filter((entry) => entry.photos[0]).slice(0, 3));
      setStreakLevel(computeStreakLevel(all));
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
    if (request.current && !request.current.signal.aborted) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(new Error('추천 시간이 초과됐어요. 다시 시도해 주세요.')), 60000);
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

      const response = await authenticatedFetch("/api/recommend-outfit", {
        signal: controller.signal,
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
      if (controller.signal.aborted && controller.signal.reason?.name === 'AbortError') return;
      const message = recommendationErrorMessage(
        err instanceof Error ? err.message : "추천을 불러오지 못했어요.",
      );
      setRecommendation({ status: "error", message });
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  }, [gender, weather]);



  const shoppingGender = genderToShopping(gender);
  const shoppingPlatforms = platformsForGender(shoppingGender);
  const styleInsight = useMemo(() => {
    const recentCutoff = dateDaysAgo(6);
    const previousCutoff = dateDaysAgo(13);
    const photoEntries = diaryEntries.filter((entry) => entry.photos.length > 0);
    const recentPhotoEntries = photoEntries.filter((entry) => diaryDate(entry) >= recentCutoff);
    const previousPhotoEntries = photoEntries.filter((entry) => {
      const date = diaryDate(entry);
      return date >= previousCutoff && date < recentCutoff;
    });

    const recentScores = new Map<string, number>();
    for (const entry of recentPhotoEntries) {
      for (const [style, score] of scoreEntryStyles(entry)) {
        increment(recentScores, style, score);
      }
    }

    const previousScores = new Map<string, number>();
    for (const entry of previousPhotoEntries) {
      for (const [style, score] of scoreEntryStyles(entry)) {
        increment(previousScores, style, score);
      }
    }

    const styles = topStyleEntries(recentScores);
    const topStyle = styles[0];
    const previousTopScore = topStyle ? previousScores.get(topStyle[0]) ?? 0 : 0;
    const trend =
      topStyle && topStyle[1] > previousTopScore
        ? "↑"
        : topStyle && topStyle[1] < previousTopScore
          ? "↓"
          : "→";

    return {
      entryCount: recentPhotoEntries.length,
      styles: percentageStyleEntries(styles),
      topLabel: topStyle?.[0] ?? null,
      trend,
    };
  }, [diaryEntries]);

  return (
    <div className="space-y-5">
      <header className="space-y-5 pb-1">
        <div className="flex items-center justify-between">
          <Link href="/home" aria-label="LOODI 홈" className="text-[30px] font-bold tracking-[-.075em]">loodi<span className="text-accent">.</span></Link>
          <div className="flex items-center gap-3"><span className="text-[9px] font-medium tracking-[.14em] text-muted-foreground">YOUR EVERYDAY, ARCHIVED.</span><Link href="/closet" aria-label="내 프로필" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card"><UserRound size={18} strokeWidth={1.5} /></Link></div>
        </div>
        <section className="journal-hero p-6">
          <div className="journal-hero-image"><Image src="/hero-model.jpg" alt="LOODI 패션 에디토리얼" fill priority sizes="448px" /></div>
          <p className="text-[9px] font-medium tracking-[.2em] text-white/75">THE EVERYDAY EDIT</p>
          <p className="editorial-serif mt-3 text-[40px] leading-none">Wear. Record.<br /><em>Repeat.</em></p>
          <h1 className="mt-4 text-sm font-medium tracking-normal text-white">오늘의 나를, 기록해요.</h1>
          <Link href="/record" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#e9eccd] px-4 text-xs font-semibold text-[#30392c]"><Plus size={16} />오늘의 룩 남기기<ArrowUpRight size={15} /></Link>
        </section>
        <dl className="journal-stats" aria-label="나의 기록 요약"><div><dt>쌓아온 룩</dt><dd>{diaryEntries.length}<span className="ml-1 text-[10px] font-normal">개</span></dd></div><div><dt>연속 기록</dt><dd>{streakLevel?.streak ?? 0}<span className="ml-1 text-[10px] font-normal">일</span></dd></div><div><dt>나의 레벨</dt><dd><span className="mr-1 text-xs font-normal">Lv.</span>{streakLevel?.level ?? 1}</dd></div></dl>
      </header>

      <Card className="diary-surface overflow-hidden border-accent/15">
        <CardHeader>
          <div>
            <p className="screen-eyebrow">FOR YOUR DAY</p>
            <CardTitle className="mt-1 text-xl">오늘의 코디</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-soft/60 px-3 py-2">
            <p className="text-sm font-medium text-primary/70">
              {weather.status === "loading"
                ? "날씨를 확인하고 있어요"
                : weather.status === "success"
                  ? `${Math.round(weather.temperature)}°C ${weather.icon}${
                      weather.location ? ` · ${weather.location}` : ""
                    }`
                  : weather.message}
            </p>
            {recommendation.status === 'success' ? <button
              type="button"
              onClick={fetchRecommendation}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-soft text-primary/60 transition hover:bg-accent hover:text-white disabled:opacity-50"
              aria-label="다시 추천 받기"
              title="다시 추천 받기"
            >
              <RefreshCw size={14} />
            </button> : null}
          </div>

          {recommendation.status === "idle" ? (
            <div className="pt-1">
              <p className="font-semibold text-primary">오늘은 어떤 룩이 좋을까요?</p>
              <p className="mb-4 mt-2 text-xs leading-relaxed text-muted-foreground">날씨와 쌓아온 기록을 바탕으로 어울리는 코디를 찾아드려요.</p>
              <Button onClick={fetchRecommendation} className="w-full gap-2"><Sparkles size={16} />오늘의 코디 추천받기</Button>
            </div>
          ) : recommendation.status === "loading" ? (
            <div className="space-y-2">
              <div className="rounded-2xl bg-soft p-4 text-sm text-primary/70">
                오늘 어울릴 코디를 분석 중...
              </div>
              <FashionTipsLoader />
            </div>
          ) : recommendation.status === "error" ? (
            <div role="alert" className="rounded-2xl bg-soft p-4 text-sm text-primary/70">
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
              <div className="rounded-lg border border-border bg-soft/80 p-4 text-sm text-primary">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">왜 이 코디?</p>
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
                    className="group rounded-lg border border-border bg-card/95 px-4 py-3 shadow-[0_8px_20px_rgba(28,44,70,0.05)] transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase text-primary/45">
                          {item.category}
                        </p>
                        <p className="truncate text-base font-semibold text-primary">
                          {item.name}
                        </p>
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soft text-xs font-semibold text-primary/55 group-hover:bg-accent group-hover:text-white">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shoppingPlatforms.map((platform) => (
                        <a
                          key={platform.id}
                          href={platform.buildUrl(item.searchKeyword, shoppingGender)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-accent hover:text-white"
                        >
                          <ShoppingPlatformMark id={platform.id} />
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

      <Card className="diary-surface overflow-hidden">
        <CardHeader>
          <div>
            <p className="text-[11px] font-semibold uppercase text-primary/45">
              Last 7 Days
            </p>
            <CardTitle className="mt-1 text-xl">요즘 나의 스타일</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl bg-soft/60 p-4 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-primary/45">
                  사진 기록
                </p>
                <p className="mt-1 text-2xl font-semibold text-primary">
                  {styleInsight.entryCount}개
                </p>
              </div>
              <span className="rounded-lg border border-border bg-soft px-3 py-2 text-sm font-semibold text-primary/75">
                {styleInsight.topLabel ?? "첫 기록을 기다려요"}
              </span>
            </div>
            {styleInsight.entryCount === 0 ? (
              <p className="mt-3 font-medium text-primary">
                아직 기록된 사진이 없어요
              </p>
            ) : styleInsight.topLabel ? (
              <div className="mt-4 space-y-3">
                <p className="font-semibold text-primary">
                  {styleInsight.topLabel} 무드가 최근 가장 강해요 {styleInsight.trend}
                </p>
                <div className="space-y-2">
                  {styleInsight.styles.map(({ style, percentage }) => (
                    <div key={style} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-primary/70">{style}</span>
                        <span className="font-semibold text-primary">{percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-soft">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-1 font-medium text-primary">
                사진은 있지만 분석 데이터가 아직 부족해요
              </p>
            )}
          </div>
          <LinkButton href="/dna" variant="outline" className="w-full gap-2">
              <Sparkles size={16} /> 내 스타일 살펴보기
            </LinkButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>최근 기록</CardTitle>
          <Link href="/timeline" className="text-xs text-accent">모두 보기</Link>
        </CardHeader>
        <CardContent>
          {recentEntries.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {recentEntries.map((entry) => {
                const photo = entry.photos[0];
                return (
                  <Link
                    key={entry.id}
                    href={`/timeline?date=${entry.date}`}
                    className="lookbook-card"
                  >
                    <Image
                      src={diaryPhotoToDataUrl(photo)}
                      alt={entry.title ?? `outfit ${entry.date}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">{entry.date.slice(5).replace('-', '.')}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-primary/55">
              아직 기록한 사진이 없어요. 룩 추가에서 첫 기록을 남겨보세요.
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
