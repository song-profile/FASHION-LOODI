"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, LogOut, MessageCircle, Sparkles, Shirt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BottomsIcon,
  OuterwearIcon,
  ShoesIcon,
  TopsIcon,
} from "@/components/icons/category-icons";
import { readDiaryEntries } from "@/lib/outfit-diary";
import { supabase } from "@/lib/supabase";
import {
  clearCurrentUserStorageId,
  setCurrentUserStorageId,
} from "@/lib/user-storage";

type Profile = {
  fullName: string;
  gender: string;
  birthDate: string;
};

type RecordedClosetGroup = {
  category: string;
  items: { name: string; used: number }[];
};

const closetCategories = [
  "Outerwear",
  "Tops",
  "Bottoms",
  "Shoes & Accessories",
] as const;

type ClosetCategory = (typeof closetCategories)[number];

const categoryIcons: Record<ClosetCategory, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Outerwear: OuterwearIcon,
  Tops: TopsIcon,
  Bottoms: BottomsIcon,
  "Shoes & Accessories": ShoesIcon,
};

const categoryStyles: Record<
  ClosetCategory,
  { label: string; accent: string; surface: string; rail: string }
> = {
  Outerwear: {
    label: "Outerwear",
    accent: "bg-[#8d3f56]",
    surface: "bg-[#8d3f56]/10",
    rail: "bg-[#8d3f56]",
  },
  Tops: {
    label: "Tops",
    accent: "bg-[#2f6b5a]",
    surface: "bg-[#2f6b5a]/10",
    rail: "bg-[#2f6b5a]",
  },
  Bottoms: {
    label: "Bottoms",
    accent: "bg-[#243b6b]",
    surface: "bg-[#243b6b]/10",
    rail: "bg-[#243b6b]",
  },
  "Shoes & Accessories": {
    label: "Shoes",
    accent: "bg-[#d0923d]",
    surface: "bg-[#d0923d]/12",
    rail: "bg-[#d0923d]",
  },
};

function normalizeItemCategory(category: string, name: string): ClosetCategory {
  const text = `${category} ${name}`.toLowerCase();

  if (
    category === "아우터" ||
    /outer|jacket|coat|blazer|cardigan|hoodie|zip|zipup|jumper|track top|집업|후드집업|후드 집업|집업후드|집업 후드|후드 자켓|후드 재킷|후드 점퍼|점퍼|자켓|재킷|코트|블레이저|가디건/.test(
      text
    )
  ) {
    return "Outerwear";
  }

  if (
    category === "상의" ||
    category === "원피스" ||
    /top|shirt|tee|t-shirt|sweatshirt|knit| 니트|티셔츠|셔츠|후드티|맨투맨|상의|블라우스|원피스/.test(
      text
    )
  ) {
    return "Tops";
  }

  if (
    category === "하의" ||
    /bottom|pants|denim|jeans|slacks|skirt|shorts|팬츠|바지|데님|청바지|슬랙스|스커트|치마|반바지/.test(
      text
    )
  ) {
    return "Bottoms";
  }

  return "Shoes & Accessories";
}

function inferItemsFromEntryText(text: string) {
  const candidates: { category: string; name: string }[] = [];

  const knownItems = [
    {
      category: "아우터",
      name: "네이비 후드집업",
      patterns: [
        "네이비 후드집업",
        "네이비 집업",
        "네이비색 후드집업",
        "네이비색 집업",
        "블루 후드집업",
        "블루 집업",
        "후드집업",
        "후드 집업",
        "집업 후드",
      ],
    },
    {
      category: "상의",
      name: "블랙 그래픽 티셔츠",
      patterns: ["블랙 그래픽 티셔츠", "그래픽 티셔츠", "티셔츠"],
    },
  ];

  for (const item of knownItems) {
    if (item.patterns.some((pattern) => text.includes(pattern))) {
      candidates.push({ category: item.category, name: item.name });
    }
  }

  return candidates;
}

function formatBirthDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function ClosetPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recordedCloset, setRecordedCloset] = useState<RecordedClosetGroup[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/");
        return;
      }

      setCurrentUserStorageId(user.id);
      const metadata = user.user_metadata ?? {};
      setProfile({
        fullName:
          typeof metadata.full_name === "string" && metadata.full_name
            ? metadata.full_name
            : "-",
        gender:
          typeof metadata.gender === "string" && metadata.gender
            ? metadata.gender
            : "-",
        birthDate:
          typeof metadata.birth_date === "string" && metadata.birth_date
            ? metadata.birth_date
            : "",
      });
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    if (loading) return;

    const itemCounts = new Map<
      string,
      { category: ClosetCategory; name: string; used: number }
    >();

    for (const entry of readDiaryEntries()) {
      const entryItems =
        entry.items && entry.items.length > 0
          ? entry.items
          : inferItemsFromEntryText(
              [entry.title, entry.styleNote, entry.memo, ...(entry.tags ?? [])]
                .filter(Boolean)
                .join(" ")
            );

      for (const item of entryItems) {
        const normalizedCategory = normalizeItemCategory(
          item.category,
          item.name
        );
        const key = `${normalizedCategory}:${item.name}`;
        const current = itemCounts.get(key);
        itemCounts.set(key, {
          category: normalizedCategory,
          name: item.name,
          used: current ? current.used + 1 : 1,
        });
      }
    }

    const grouped = new Map<ClosetCategory, { name: string; used: number }[]>();
    for (const item of itemCounts.values()) {
      const list = grouped.get(item.category) ?? [];
      list.push({ name: item.name, used: item.used });
      grouped.set(item.category, list);
    }

    setRecordedCloset(
      closetCategories.map((category) => ({
        category,
        items: (grouped.get(category) ?? []).sort((a, b) => b.used - a.used),
      }))
    );
  }, [loading]);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearCurrentUserStorageId();
    router.replace("/");
  };

  const totalItems = recordedCloset.reduce(
    (sum, group) => sum + group.items.length,
    0
  );
  const totalWears = recordedCloset.reduce(
    (sum, group) =>
      sum + group.items.reduce((itemSum, item) => itemSum + item.used, 0),
    0
  );

  return (
    <div className="space-y-5">
      <section className="diary-surface rounded-lg border border-border px-4 py-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="diary-label">WARDROBE INDEX</span>
            <h1 className="mt-3 text-2xl font-semibold text-primary">Closet</h1>
            <p className="mt-1 text-sm text-primary/60">
              기록에서 자주 등장한 아이템을 옷장처럼 정리했어요.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-accent shadow-soft">
            <Shirt size={22} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card/85 p-3">
            <p className="text-[11px] font-semibold uppercase text-primary/45">
              Pieces
            </p>
            <p className="mt-1 text-xl font-semibold text-primary">
              {loading ? "-" : totalItems}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/85 p-3">
            <p className="text-[11px] font-semibold uppercase text-primary/45">
              Logged Wears
            </p>
            <p className="mt-1 text-xl font-semibold text-primary">
              {loading ? "-" : totalWears}
            </p>
          </div>
        </div>
      </section>

      <Card className="diary-surface">
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-primary">내 정보</p>
            <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut size={14} />
              로그아웃
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-primary/60">내 정보를 불러오는 중...</p>
          ) : profile ? (
            <div className="grid gap-2 text-sm text-primary sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card/80 p-3">
                <span className="text-primary/60">성명</span>
                <p className="mt-1 font-medium">{profile.fullName}</p>
              </div>
              <div className="rounded-lg border border-border bg-card/80 p-3">
                <span className="text-primary/60">성별</span>
                <p className="mt-1 font-medium">{profile.gender}</p>
              </div>
              <div className="rounded-lg border border-border bg-card/80 p-3">
                <span className="text-primary/60">생년월일</span>
                <p className="mt-1 font-medium">
                  {formatBirthDate(profile.birthDate)}
                </p>
              </div>
            </div>
          ) : null}

          <Link
            href="/contact"
            className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm text-primary transition hover:bg-soft"
          >
            <span className="flex items-center gap-2">
              <MessageCircle size={16} className="text-accent" />
              <span className="font-medium">문의하기</span>
              <span className="text-xs text-primary/55">AI 챗봇</span>
            </span>
            <ChevronRight size={16} className="text-primary/40" />
          </Link>
        </CardContent>
      </Card>

      {recordedCloset.map((group) => {
        const Icon = categoryIcons[group.category as ClosetCategory];
        const style = categoryStyles[group.category as ClosetCategory];
        const topUsed = Math.max(...group.items.map((item) => item.used), 1);
        return (
          <Card key={group.category} className="diary-surface overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  {Icon ? (
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${style.surface} text-primary`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  ) : null}
                  <span>
                    {group.category}
                    <span className="mt-0.5 block text-xs font-medium text-primary/45">
                      {group.items.length} pieces
                    </span>
                  </span>
                </CardTitle>
                <span className={`h-8 w-2 rounded-full ${style.accent}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.length > 0 ? (
                group.items.map((item, index) => (
                  <div
                    key={`${group.category}-${item.name}`}
                    className="rounded-lg border border-border bg-card/90 p-3 shadow-[0_8px_20px_rgba(28,44,70,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-soft text-[11px] font-semibold text-primary/60">
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-semibold text-primary">
                            {item.name}
                          </p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-soft">
                          <div
                            className={`h-full rounded-full ${style.rail}`}
                            style={{
                              width: `${Math.max(18, Math.round((item.used / topUsed) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <Badge className="shrink-0 border border-border bg-soft text-primary">
                        {item.used}회
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-soft/70 p-4 text-sm text-primary/55">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <Sparkles size={15} className="text-accent" />
                    <span className="font-semibold">{style.label} 비어 있음</span>
                  </div>
                  Timeline 기록에서 이 카테고리 아이템이 발견되면 자동으로 채워져요.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
