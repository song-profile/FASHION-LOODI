"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Cake,
  Camera,
  ChevronRight,
  Copy,
  Grid3X3,
  IdCard,
  Link2,
  LogOut,
  MessageCircle,
  Share2,
  Shirt,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BottomsIcon,
  OuterwearIcon,
  ShoesIcon,
  TopsIcon,
} from "@/components/icons/category-icons";
import {
  diaryPhotoToDataUrl,
  readDiaryEntries,
  type DiaryEntry,
} from "@/lib/outfit-diary";
import { supabase } from "@/lib/supabase";
import {
  clearCurrentUserStorageId,
  setCurrentUserStorageId,
  scopedLocalStorageKey,
} from "@/lib/user-storage";

type Profile = {
  nickname: string;
  fullName: string;
  gender: string;
  birthDate: string;
  email: string;
};

type RecordedClosetGroup = {
  category: string;
  items: { name: string; used: number }[];
};

const PROFILE_PHOTO_STORAGE_KEY = "loodi_profile_photo";

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

function calculateAge(value: string) {
  if (!value) return "-";
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "-";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return `${age}세`;
}

export default function ClosetPage() {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recordedCloset, setRecordedCloset] = useState<RecordedClosetGroup[]>(
    []
  );
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProfilePanel, setActiveProfilePanel] = useState<
    "manage" | "share" | null
  >(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

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
        nickname:
          typeof metadata.nickname === "string" && metadata.nickname
            ? metadata.nickname
            : typeof metadata.login_id === "string" && metadata.login_id
              ? metadata.login_id
              : "-",
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
        email: user.email ?? "-",
      });
      setDiaryEntries(readDiaryEntries());
      setProfilePhotoUrl(
        window.localStorage.getItem(
          scopedLocalStorageKey(PROFILE_PHOTO_STORAGE_KEY)
        ) ?? ""
      );
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

  const saveProfilePhoto = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      window.localStorage.setItem(
        scopedLocalStorageKey(PROFILE_PHOTO_STORAGE_KEY),
        result
      );
      setProfilePhotoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePhoto = () => {
    window.localStorage.removeItem(
      scopedLocalStorageKey(PROFILE_PHOTO_STORAGE_KEY)
    );
    setProfilePhotoUrl("");
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
  const shareEntries = diaryEntries
    .filter((entry) => entry.photos.length > 0)
    .slice(0, 6);
  const displayName =
    profile?.nickname && profile.nickname !== "-"
      ? profile.nickname
      : "LOODI 사용자";
  const realName =
    profile?.fullName && profile.fullName !== "-" ? profile.fullName : "";
  const shareTitle = `${displayName}님의 LOODI 스타일 기록`;
  const shareDescription = `${diaryEntries.length}개의 기록과 ${totalItems}개의 아이템으로 만든 스타일 아카이브`;

  const shareProfile = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareText = `${shareTitle}\n${shareDescription}`;

    if (
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: shareUrl,
        });
        return;
      } catch {
        // Continue to clipboard fallback.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    }
  };

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
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-soft text-primary/30 transition hover:border-accent"
                  aria-label="프로필 사진 설정"
                >
                  {profilePhotoUrl ? (
                    <Image
                      src={profilePhotoUrl}
                      alt="프로필 사진"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <UserRound size={42} strokeWidth={1.5} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-primary shadow-soft"
                  aria-label="프로필 사진 변경"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) saveProfilePhoto(file);
                    event.target.value = "";
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold tracking-tight text-primary">
                  {loading ? "..." : displayName}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              aria-label="로그아웃"
            >
              <LogOut size={16} />
            </Button>
          </div>

          <p className="text-xl font-semibold text-primary">
            {loading ? "내 정보" : realName || displayName}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeProfilePanel === "manage" ? "default" : "outline"}
              className="h-12 gap-2 rounded-lg text-base"
              onClick={() =>
                setActiveProfilePanel((current) =>
                  current === "manage" ? null : "manage"
                )
              }
            >
              <IdCard size={18} />
              프로필 관리
            </Button>
            <Button
              variant={activeProfilePanel === "share" ? "default" : "outline"}
              className="h-12 gap-2 rounded-lg text-base"
              onClick={() =>
                setActiveProfilePanel((current) =>
                  current === "share" ? null : "share"
                )
              }
            >
              <Share2 size={18} />
              프로필 공유
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-primary/60">내 정보를 불러오는 중...</p>
          ) : activeProfilePanel === "manage" && profile ? (
            <div className="space-y-3 rounded-lg border border-border bg-card/80 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm text-primary">
                <div className="rounded-lg bg-soft p-3">
                  <span className="flex items-center gap-1.5 text-primary/55">
                    <UserRound size={14} />
                    닉네임
                  </span>
                  <p className="mt-1 font-semibold">{profile.nickname}</p>
                </div>
                <div className="rounded-lg bg-soft p-3">
                  <span className="text-primary/55">이름</span>
                  <p className="mt-1 font-semibold">{profile.fullName}</p>
                </div>
                <div className="rounded-lg bg-soft p-3">
                  <span className="flex items-center gap-1.5 text-primary/55">
                    <Cake size={14} />
                    나이
                  </span>
                  <p className="mt-1 font-semibold">
                    {calculateAge(profile.birthDate)}
                  </p>
                </div>
                <div className="rounded-lg bg-soft p-3">
                  <span className="text-primary/55">성별</span>
                  <p className="mt-1 font-semibold">{profile.gender}</p>
                </div>
              </div>
              <div className="rounded-lg bg-soft p-3 text-sm text-primary">
                <span className="text-primary/55">생년월일</span>
                <p className="mt-1 font-semibold">
                  {formatBirthDate(profile.birthDate)}
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-primary/55">
                계정: {profile.email}
              </div>
              <Link
                href="/profile/setup?next=%2Fcloset&edit=1"
                className="flex h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-white"
              >
                이름과 개인정보 수정
              </Link>
              {profilePhotoUrl ? (
                <button
                  type="button"
                  onClick={removeProfilePhoto}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary/70"
                >
                  프로필 사진 삭제
                </button>
              ) : null}
            </div>
          ) : activeProfilePanel === "share" ? (
            <div className="space-y-3 rounded-lg border border-border bg-card/80 p-3">
              <div className="rounded-lg border border-border bg-white p-3 shadow-[0_8px_20px_rgba(28,44,70,0.05)]">
                <div className="flex items-center gap-2">
                  <Grid3X3 size={16} className="text-accent" />
                  <p className="text-sm font-semibold text-primary">
                    공유 미리보기
                  </p>
                </div>
                <p className="mt-2 text-base font-semibold text-primary">
                  {shareTitle}
                </p>
                <p className="mt-1 text-xs text-primary/55">
                  {shareDescription}
                </p>
                {shareEntries.length > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {shareEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="relative aspect-square overflow-hidden rounded-md bg-soft"
                      >
                        <Image
                          src={diaryPhotoToDataUrl(entry.photos[0])}
                          alt={`공유 룩 ${entry.date}`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-border bg-soft/70 p-4 text-xs text-primary/55">
                    공유할 기록이 아직 없어요. Record에서 사진을 저장하면 Grid
                    View로 일부만 보여줄 수 있어요.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="gap-2 rounded-lg" onClick={shareProfile}>
                  <Link2 size={16} />
                  카카오톡/공유
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-lg"
                  onClick={shareProfile}
                >
                  <Copy size={16} />
                  {shareCopied ? "복사됨" : "링크 복사"}
                </Button>
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
