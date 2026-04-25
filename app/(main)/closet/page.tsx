"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readDiaryEntries } from "@/lib/outfit-diary";
import { supabase } from "@/lib/supabase";

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
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-primary">Closet</h1>
        <Button variant="outline" size="sm" onClick={signOut}>
          로그아웃
        </Button>
      </header>

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm font-semibold text-primary">내 정보</p>
          {loading ? (
            <p className="text-sm text-primary/60">내 정보를 불러오는 중...</p>
          ) : profile ? (
            <div className="grid gap-2 text-sm text-primary">
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary/60">성명</span>
                <span className="font-medium">{profile.fullName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary/60">성별</span>
                <span className="font-medium">{profile.gender}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-primary/60">생년월일</span>
                <span className="font-medium">
                  {formatBirthDate(profile.birthDate)}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {recordedCloset.map((group) => (
        <Card key={group.category}>
          <CardHeader>
            <CardTitle>{group.category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.items.length > 0 ? (
              group.items.map((item) => (
                <div
                  key={`${group.category}-${item.name}`}
                  className="flex items-center justify-between rounded-2xl bg-soft p-3"
                >
                  <p className="text-sm font-medium text-primary">
                    {item.name}
                  </p>
                  <Badge>Saved {item.used} times</Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-soft p-3 text-sm text-primary/55">
                아직 Timeline 기록에서 발견된 아이템이 없어요.
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
