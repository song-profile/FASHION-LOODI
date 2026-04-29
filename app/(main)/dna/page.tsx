"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDiaryEntries, type DiaryEntry } from "@/lib/outfit-diary";

const STYLE_KEYWORDS = [
  {
    label: "Casual",
    tokens: ["캐주얼", "편안", "데일리", "프레피", "워크웨어", "시티보이"],
    color: "#8B6E5A",
  },
  {
    label: "Street",
    tokens: ["스트릿", "힙합", "스케이터", "테크웨어", "후드", "오버사이즈"],
    color: "#1A1A2E",
  },
  {
    label: "Minimal",
    tokens: ["미니멀", "모던", "톤온톤", "클린", "정제", "심플"],
    color: "#8A857E",
  },
  {
    label: "Classic",
    tokens: ["클래식", "트래드", "아이비", "테일러드", "단정", "포멀"],
    color: "#5A4D43",
  },
  {
    label: "Sporty",
    tokens: ["스포티", "애슬레저", "러닝", "고프코어", "활동", "기능성"],
    color: "#6E885A",
  },
  {
    label: "Vintage",
    tokens: ["빈티지", "레트로", "아메카지", "브라운", "데님"],
    color: "#935A6E",
  },
];

function increment(map: Map<string, number>, key: string, amount = 1) {
  const normalized = key.trim();
  if (!normalized) return;
  map.set(normalized, (map.get(normalized) ?? 0) + amount);
}

function topEntries(map: Map<string, number>, limit = 6) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function scoreEntryStyles(entry: DiaryEntry) {
  const text = [
    ...(entry.tags ?? []),
    ...(entry.colors ?? []),
    ...(entry.items ?? []).map((item) => item.name),
    entry.styleNote,
    entry.memo,
    entry.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores = new Map<string, number>();
  for (const style of STYLE_KEYWORDS) {
    const score = style.tokens.reduce((sum, token) => {
      return text.includes(token.toLowerCase()) ? sum + 1 : sum;
    }, 0);
    if (score > 0) scores.set(style.label, score);
  }

  if (scores.size === 0 && entry.tags?.length) {
    increment(scores, entry.tags[0], 1);
  }

  return scores;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function monthLabel(dateKey: string) {
  const [, month] = dateKey.split("-");
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(2026, Number(month) - 1, 1),
  );
}

export default function StyleDnaPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useEffect(() => {
    const loadEntries = () => setEntries(readDiaryEntries());
    loadEntries();
    window.addEventListener("focus", loadEntries);
    return () => window.removeEventListener("focus", loadEntries);
  }, []);

  const dna = useMemo(() => {
    const entriesWithPhotos = entries.filter((entry) => entry.photos.length > 0);
    const styleScores = new Map<string, number>();
    const colorCounts = new Map<string, number>();
    const itemCounts = new Map<string, number>();
    const monthlyStyles = new Map<string, Map<string, number>>();

    for (const entry of entriesWithPhotos) {
      for (const color of entry.colors ?? []) increment(colorCounts, color);
      for (const item of entry.items ?? []) increment(itemCounts, item.name);

      const entryStyleScores = scoreEntryStyles(entry);
      const month = entry.date.slice(0, 7);
      const monthMap = monthlyStyles.get(month) ?? new Map<string, number>();

      for (const [style, score] of entryStyleScores) {
        increment(styleScores, style, score);
        increment(monthMap, style, score);
      }

      if (entryStyleScores.size === 0) {
        increment(styleScores, "Unclassified");
        increment(monthMap, "Unclassified");
      }

      monthlyStyles.set(month, monthMap);
    }

    const styleTotal = [...styleScores.values()].reduce((sum, value) => sum + value, 0);
    const styles = topEntries(styleScores).map(([label, count], index) => ({
      label,
      count,
      percentage: percent(count, styleTotal),
      color:
        STYLE_KEYWORDS.find((style) => style.label === label)?.color ??
        ["#8B6E5A", "#1A1A2E", "#C4AB82", "#5A7D8B", "#935A6E"][index % 5],
    }));

    const months = [...monthlyStyles.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-3)
      .map(([month, map]) => {
        const topStyle = topEntries(map, 1)[0];
        return {
          month,
          label: monthLabel(month),
          style: topStyle?.[0] ?? "No data",
          count: topStyle?.[1] ?? 0,
        };
      });

    return {
      entryCount: entriesWithPhotos.length,
      styles,
      colors: topEntries(colorCounts, 8),
      items: topEntries(itemCounts, 5),
      months,
    };
  }, [entries]);

  const conicGradient =
    dna.styles.length > 0
      ? `conic-gradient(${dna.styles
          .reduce(
            (segments, style) => {
              const start = segments.offset;
              const end = start + style.percentage;
              segments.parts.push(`${style.color} ${start}% ${end}%`);
              segments.offset = end;
              return segments;
            },
            { offset: 0, parts: [] as string[] },
          )
          .parts.join(", ")})`
      : undefined;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-primary">Style DNA</h1>

      {dna.entryCount === 0 ? (
        <Card>
          <CardContent className="space-y-2 py-8 text-center">
            <p className="text-base font-semibold text-primary">
              아직 분석할 기록이 없어요.
            </p>
            <p className="text-sm text-primary/60">
              Record에서 사진을 저장하면 그 기록만 바탕으로 Style DNA가 만들어집니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Style Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="mx-auto h-44 w-44 rounded-full"
                style={{ background: conicGradient }}
              />
              <div className="space-y-1 text-sm">
                {dna.styles.map((style) => (
                  <div
                    key={style.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: style.color }}
                      />
                      {style.label}
                    </span>
                    <span>{style.percentage}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-primary/55">
                사진이 저장된 기록 {dna.entryCount}개 기준
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {dna.colors.length > 0 ? (
                dna.colors.map(([color, count]) => (
                  <Badge key={color}>
                    {color} {count > 1 ? count : ""}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-primary/55">
                  저장된 기록에서 색상 데이터가 아직 없어요.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frequent Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {dna.items.length > 0 ? (
                dna.items.map(([item, count]) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl bg-soft p-3"
                  >
                    <span>{item}</span>
                    <span className="text-primary/60">{count}회</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-primary/55">
                  저장된 기록에서 아이템 데이터가 아직 없어요.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Style Evolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dna.months.map((month) => (
                <div key={month.month} className="rounded-2xl bg-soft p-3">
                  {month.label}: {month.style}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
