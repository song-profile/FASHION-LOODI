"use client";

import { ChartNoAxesColumnIncreasing, Dna, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDiaryEntries, type DiaryEntry } from "@/lib/outfit-diary";

const STYLE_KEYWORDS = [
  {
    label: "Casual",
    tokens: ["캐주얼", "편안", "데일리", "프레피", "워크웨어", "시티보이"],
    color: "#2F6B5A",
  },
  {
    label: "Street",
    tokens: ["스트릿", "힙합", "스케이터", "테크웨어", "후드", "오버사이즈"],
    color: "#243B6B",
  },
  {
    label: "Minimal",
    tokens: ["미니멀", "모던", "톤온톤", "클린", "정제", "심플"],
    color: "#9CA3AF",
  },
  {
    label: "Classic",
    tokens: ["클래식", "트래드", "아이비", "테일러드", "단정", "포멀"],
    color: "#8D3F56",
  },
  {
    label: "Sporty",
    tokens: ["스포티", "애슬레저", "러닝", "고프코어", "활동", "기능성"],
    color: "#D0923D",
  },
  {
    label: "Vintage",
    tokens: ["빈티지", "레트로", "아메카지", "브라운", "데님"],
    color: "#8A6A4F",
  },
];

const COLOR_SWATCHES: Array<{
  tokens: string[];
  background: string;
  foreground: string;
  border?: string;
}> = [
  { tokens: ["네이비", "navy"], background: "#1f2f55", foreground: "#ffffff" },
  { tokens: ["블랙", "black"], background: "#151515", foreground: "#ffffff" },
  { tokens: ["그레이", "gray", "grey", "회색"], background: "#8f949c", foreground: "#ffffff" },
  { tokens: ["실버", "silver"], background: "#c9ccd1", foreground: "#1f2937" },
  { tokens: ["화이트", "white", "흰색"], background: "#ffffff", foreground: "#1f2937", border: "#d7dce5" },
  { tokens: ["아이보리", "ivory", "크림", "cream"], background: "#f4ead7", foreground: "#1f2937" },
  { tokens: ["베이지", "beige"], background: "#d6c2a5", foreground: "#1f2937" },
  { tokens: ["브라운", "brown"], background: "#7a5338", foreground: "#ffffff" },
  { tokens: ["카키", "khaki", "올리브", "olive"], background: "#687452", foreground: "#ffffff" },
  { tokens: ["그린", "green", "초록"], background: "#2f6b5a", foreground: "#ffffff" },
  { tokens: ["블루", "blue", "파랑"], background: "#315f9b", foreground: "#ffffff" },
  { tokens: ["라이트 블루", "light blue", "하늘"], background: "#b8d5ef", foreground: "#1f2937" },
  { tokens: ["레드", "red", "빨강"], background: "#a83e4c", foreground: "#ffffff" },
  { tokens: ["핑크", "pink"], background: "#e9a6b8", foreground: "#1f2937" },
  { tokens: ["옐로", "yellow", "노랑"], background: "#e5bd4f", foreground: "#1f2937" },
  { tokens: ["오렌지", "orange"], background: "#d9823b", foreground: "#ffffff" },
  { tokens: ["퍼플", "purple", "보라"], background: "#76509d", foreground: "#ffffff" },
  { tokens: ["데님", "denim"], background: "#355f86", foreground: "#ffffff" },
];

function swatchForColor(color: string) {
  const normalized = color.trim().toLowerCase();
  return (
    COLOR_SWATCHES.find((swatch) =>
      swatch.tokens.some((token) => normalized.includes(token.toLowerCase())),
    ) ?? {
      background: "#f3eee4",
      foreground: "#1f2937",
      border: "#d7dce5",
    }
  );
}

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

function percentageEntries(entries: Array<[string, number]>) {
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) {
    return entries.map(([label, count]) => ({ label, count, percentage: 0 }));
  }

  const calculated = entries.map(([label, count]) => {
    const exact = (count / total) * 100;
    return {
      label,
      count,
      percentage: Math.floor(exact),
      remainder: exact % 1,
    };
  });

  let remaining = 100 - calculated.reduce((sum, item) => sum + item.percentage, 0);
  for (const item of [...calculated].sort((a, b) => b.remainder - a.remainder)) {
    if (remaining <= 0) break;
    item.percentage += 1;
    remaining -= 1;
  }

  return calculated.map(({ label, count, percentage }) => ({
    label,
    count,
    percentage,
  }));
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
    const monthlyStyles = new Map<string, Map<string, number>>();

    for (const entry of entriesWithPhotos) {
      for (const color of entry.colors ?? []) increment(colorCounts, color);

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

    const styles = percentageEntries(topEntries(styleScores)).map((style, index) => ({
      label: style.label,
      count: style.count,
      percentage: style.percentage,
      color:
        STYLE_KEYWORDS.find((keyword) => keyword.label === style.label)?.color ??
        ["#2F6B5A", "#243B6B", "#8D3F56", "#D0923D", "#8A6A4F"][index % 5],
    }));

    const months = [...monthlyStyles.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-3)
      .map(([month, map], index) => {
        const topStyle = topEntries(map, 1)[0];
        const total = [...map.values()].reduce((sum, value) => sum + value, 0);
        const style = topStyle?.[0] ?? "No data";
        const count = topStyle?.[1] ?? 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return {
          month,
          label: monthLabel(month),
          style,
          count,
          percentage,
          color:
            STYLE_KEYWORDS.find((keyword) => keyword.label === style)?.color ??
            ["#2F6B5A", "#243B6B", "#8D3F56", "#D0923D", "#8A6A4F"][index % 5],
        };
      });

    return {
      entryCount: entriesWithPhotos.length,
      styles,
      colors: topEntries(colorCounts, 8),
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
      <section className="diary-surface rounded-lg border border-border px-4 py-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="diary-label">STYLE REPORT</span>
            <h1 className="mt-3 text-2xl font-semibold text-primary">Style DNA</h1>
            <p className="mt-1 text-sm text-primary/60">
              기록된 착장에서 반복되는 취향 신호를 모아봤어요.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-accent shadow-soft">
            <Dna size={22} />
          </div>
        </div>
      </section>

      {dna.entryCount === 0 ? (
        <Card className="diary-surface">
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
          <Card className="diary-surface overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-primary/45">
                    Distribution
                  </p>
                  <CardTitle className="mt-1 text-xl">Style Signature</CardTitle>
                </div>
                <Badge className="border border-highlight/20 bg-highlight/10 text-primary">
                  {dna.entryCount} looks
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
                <div className="relative mx-auto h-56 w-56 rounded-full bg-card p-3 shadow-[0_24px_70px_rgba(28,44,70,0.14)]">
                  <div className="absolute -right-3 top-8 rotate-6 rounded-sm border border-border bg-secondary px-2 py-1 text-[10px] font-semibold text-primary/70 shadow-soft">
                    TOP {dna.styles[0]?.percentage ?? 0}%
                  </div>
                  <div
                    className="h-full w-full rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.60)]"
                    style={{ background: conicGradient }}
                  />
                  <div className="absolute inset-[62px] flex flex-col items-center justify-center rounded-full border border-border bg-card text-center shadow-[0_16px_32px_rgba(28,44,70,0.12)]">
                    <Sparkles size={16} className="mb-1 text-accent" />
                    <span className="text-[11px] font-semibold uppercase text-primary/45">
                      Top Mood
                    </span>
                    <span className="text-lg font-semibold text-primary">
                      {dna.styles[0]?.label ?? "-"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-card/80 p-3">
                      <p className="text-[11px] font-semibold uppercase text-primary/45">
                        Top Style
                      </p>
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {dna.styles[0]?.label ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card/80 p-3">
                      <p className="text-[11px] font-semibold uppercase text-primary/45">
                        Patterns
                      </p>
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {dna.styles.length}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-dashed border-border bg-soft/70 p-3 text-xs leading-relaxed text-primary/65">
                    가장 많이 반복된 스타일은{" "}
                    <span className="font-semibold text-primary">
                      {dna.styles[0]?.label ?? "-"}
                    </span>
                    입니다. 아래 칩에서 나머지 취향 비율을 확인할 수 있어요.
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {dna.styles.map((style, index) => (
                  <div
                    key={style.label}
                    className="rounded-lg border border-border bg-card/90 p-3 shadow-[0_8px_20px_rgba(28,44,70,0.06)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 flex-shrink-0 rounded-sm"
                          style={{ backgroundColor: style.color }}
                        />
                        <span className="truncate text-sm font-semibold text-primary">
                          {index + 1}. {style.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-primary/70">
                        {style.percentage}%
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${style.percentage}%`,
                          backgroundColor: style.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="flex items-center gap-1 text-xs text-primary/55">
                <ChartNoAxesColumnIncreasing size={13} />
                사진이 저장된 기록 {dna.entryCount}개 기준
              </p>
            </CardContent>
          </Card>

          <Card className="diary-surface">
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {dna.colors.length > 0 ? (
                dna.colors.map(([color, count]) => {
                  const swatch = swatchForColor(color);
                  return (
                    <span
                      key={color}
                      className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium shadow-[0_8px_18px_rgba(28,44,70,0.08)]"
                      style={{
                        backgroundColor: swatch.background,
                        borderColor: swatch.border ?? swatch.background,
                        color: swatch.foreground,
                      }}
                    >
                      {color} {count > 1 ? count : ""}
                    </span>
                  );
                })
              ) : (
                <p className="text-sm text-primary/55">
                  저장된 기록에서 색상 데이터가 아직 없어요.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="diary-surface overflow-hidden">
            <CardHeader>
              <div>
                <p className="text-[11px] font-semibold uppercase text-primary/45">
                  Monthly Flow
                </p>
                <CardTitle className="mt-1 text-xl">Style Evolution</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {dna.months.length > 0 ? (
                <>
                  <div className="relative space-y-3">
                    <div className="absolute bottom-8 left-4 top-8 w-px bg-border" />
                    {dna.months.map((month, index) => (
                      <div
                        key={month.month}
                        className="relative ml-7 rounded-lg border border-border bg-card/90 p-4 shadow-[0_10px_24px_rgba(28,44,70,0.06)]"
                      >
                        <span className="absolute -left-[45px] top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-soft text-sm font-semibold text-primary shadow-soft">
                            {index + 1}
                        </span>
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-sm bg-soft px-2 py-1 text-[11px] font-semibold uppercase text-primary/50">
                            {month.label}
                          </span>
                          <span className="text-xs font-semibold text-primary/45">
                            {month.percentage}%
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-semibold text-primary">
                          {month.style}
                        </p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{
                              width: `${Math.max(12, month.percentage)}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-primary/55">
                          월 내 스타일 신호 {month.percentage}% · {month.count}회
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-dashed border-border bg-soft/70 p-4 text-sm leading-relaxed text-primary/65">
                    {dna.months.length > 1 ? (
                      <>
                        최근 흐름은{" "}
                        <span className="font-semibold text-primary">
                          {dna.months[0].label} {dna.months[0].style}
                        </span>
                        에서{" "}
                        <span className="font-semibold text-primary">
                          {dna.months[dna.months.length - 1].label}{" "}
                          {dna.months[dna.months.length - 1].style}
                        </span>
                        쪽으로 이동하고 있어요.
                      </>
                    ) : (
                      "월별 기록이 쌓이면 스타일 흐름이 더 선명하게 표시돼요."
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-primary/55">
                  월별 스타일 흐름을 만들 기록이 아직 없어요.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
