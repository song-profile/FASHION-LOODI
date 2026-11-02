"use client";
import { ScreenHeader } from "@/components/layout/screen-header";
import { ClosetGroups } from "@/components/closet/closet-groups";
import { DiaryBackupPanel } from '@/components/closet/diary-backup-panel';
import { compressImageForUpload } from '@/lib/onboarding-analysis-images';
import { RecordedClosetGroup, closetCategories, ClosetCategory, normalizeItemCategory, inferItemsFromEntryText, formatBirthDate, calculateAge } from "@/lib/closet-model";

import { useAccountDeletion } from "@/hooks/use-account-deletion";
import { shareStyle } from "@/lib/share";

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
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

const PROFILE_PHOTO_STORAGE_KEY = "loodi_profile_photo";

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
  const [profileError, setProfileError] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
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
      } catch { setProfileError('프로필을 불러오지 못했어요. 연결을 확인하고 다시 열어주세요.'); }
      finally { setLoading(false); }
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    if (loading) return;

    const itemCounts = new Map<
      string,
      { category: ClosetCategory; name: string; used: number }
    >();

    for (const entry of diaryEntries) {
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
  }, [loading, diaryEntries]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { setProfileError('로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.'); return; }
    clearCurrentUserStorageId();
    router.replace("/");
  };

  const saveProfilePhoto = async (file: File) => {
    setProfileError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileError('5MB 이하의 JPG, PNG, WEBP, GIF 사진을 선택해 주세요.'); return;
    }
    setPhotoSaving(true);
    try {
      const photo = await compressImageForUpload(file, 512, .8);
      const result = diaryPhotoToDataUrl(photo);
      window.localStorage.setItem(
        scopedLocalStorageKey(PROFILE_PHOTO_STORAGE_KEY),
        result
      );
      setProfilePhotoUrl(result);
    } catch { setProfileError('사진을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요.'); }
    finally { setPhotoSaving(false); }
  };

  const removeProfilePhoto = () => {
    try {
    window.localStorage.removeItem(
      scopedLocalStorageKey(PROFILE_PHOTO_STORAGE_KEY)
    );
    setProfilePhotoUrl("");
    setProfileError('');
    } catch { setProfileError('프로필 사진을 삭제하지 못했어요. 다시 시도해 주세요.'); }
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

  const { deletingAccount, deleteError, deleteAccount } = useAccountDeletion();
  const [shareError, setShareError] = useState("");
  const copyProfile = async () => {
    try { await navigator.clipboard.writeText(`${shareTitle}\n${shareDescription}`); setShareCopied(true); window.setTimeout(() => setShareCopied(false), 1800); }
    catch { setShareError("복사하지 못했어요. 공유 버튼을 이용해 주세요."); }
  };
  const shareProfile = async () => {
    try {
      setShareError("");
      const copied = await shareStyle(shareTitle, shareDescription);
      if (copied) { setShareCopied(true); window.setTimeout(() => setShareCopied(false), 1800); }
    } catch { setShareError("공유하지 못했어요. 소개 복사를 이용해 주세요."); }
  };

  return (
    <div className="space-y-5">
      {profileError ? <p role="alert" className="rounded-2xl bg-soft p-4 text-sm text-destructive">{profileError}</p> : null}
      {photoSaving ? <p role="status" className="text-sm text-muted-foreground">프로필 사진을 저장하고 있어요.</p> : null}
      {shareError ? <p role="alert" className="rounded-2xl bg-soft p-4 text-sm text-destructive">{shareError}</p> : null}
      <section className="space-y-3">
        <ScreenHeader eyebrow="MY WARDROBE" title="나의 옷장" description="자주 입는 옷부터, 나를 닮은 아이템까지." />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card/85 p-3">
            <p className="text-[11px] font-semibold uppercase text-primary/45">
              옷장 아이템
            </p>
            <p className="mt-1 text-xl font-semibold text-primary">
              {loading ? "-" : totalItems}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/85 p-3">
            <p className="text-[11px] font-semibold uppercase text-primary/45">
              착용 기록
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
                  disabled={photoSaving}
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
                className="flex h-12 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-white"
              >
                이름과 개인정보 수정
              </Link>
              <Button className="w-full" variant="outline" disabled={deletingAccount} onClick={deleteAccount}>
                {deletingAccount ? "계정 삭제 중..." : "계정 영구 삭제"}
              </Button>
              {deleteError ? <p role="alert" className="text-sm text-destructive">{deleteError}</p> : null}
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
                  공유하기
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 rounded-lg"
                  onClick={copyProfile}
                >
                  <Copy size={16} />
                  {shareCopied ? "복사됨" : "소개 복사"}
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

      <ClosetGroups groups={recordedCloset} />
      <DiaryBackupPanel onRestore={() => setDiaryEntries(readDiaryEntries())} />
    </div>
  );
}
