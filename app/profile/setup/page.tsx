"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const MIN_BIRTH_DATE = "1950-01-01";
const genderOptions = ["남성", "여성", "선택 안 함"];

function todayDateValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function ProfileSetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nickname, setNickname] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const maxBirthDate = todayDateValue();

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata;
      const nextPath = searchParams.get("next") ?? "/home";
      const isEditMode = searchParams.get("edit") === "1";

      if (
        !isEditMode &&
        typeof metadata?.nickname === "string" &&
        metadata.nickname.trim().length > 0 &&
        typeof metadata?.full_name === "string" &&
        metadata.full_name.trim().length > 0 &&
        typeof metadata?.gender === "string" &&
        metadata.gender.trim().length > 0 &&
        typeof metadata?.birth_date === "string" &&
        metadata.birth_date.trim().length > 0
      ) {
        router.replace(nextPath);
        return;
      }

      if (typeof metadata?.nickname === "string") {
        setNickname(metadata.nickname);
      } else if (typeof metadata?.login_id === "string") {
        setNickname(metadata.login_id);
      }

      if (typeof metadata?.full_name === "string") {
        setFullName(metadata.full_name);
      } else if (typeof metadata?.name === "string") {
        setFullName(metadata.name);
      }

      if (typeof metadata?.gender === "string") setGender(metadata.gender);
      if (typeof metadata?.birth_date === "string") {
        setBirthDate(metadata.birth_date);
      }
    };

    loadUser();
  }, [router, searchParams]);

  const saveProfile = async () => {
    if (!nickname.trim() || !fullName.trim() || !gender || !birthDate) {
      setError("닉네임, 이름, 성별, 생년월일을 모두 입력해 주세요.");
      return;
    }

    if (birthDate < MIN_BIRTH_DATE || birthDate > maxBirthDate) {
      setError("생년월일은 1950년 1월 1일부터 오늘까지만 선택할 수 있어요.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        nickname: nickname.trim(),
        full_name: fullName.trim(),
        gender,
        birth_date: birthDate,
      },
    });

    setSaving(false);

    if (updateError) {
      setError("내 정보를 저장하지 못했어요. 다시 시도해 주세요.");
      return;
    }

    router.replace(searchParams.get("next") ?? "/home");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-white px-4 py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/45">
            Profile
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            이름이나 닉네임을 정해 주세요
          </h1>
          <p className="text-sm leading-relaxed text-primary/60">
            닉네임은 내 정보 화면 맨 위에 표시되고, 이름은 프로필 관리에서
            개인정보로 따로 보여줘요.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-primary">
              닉네임
            </span>
            <Input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="예: songsong"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-primary">
              이름
            </span>
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="예: 송주영"
            />
          </label>

          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">성별</p>
            <div className="grid grid-cols-3 gap-2">
              {genderOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(option)}
                  className={cn(
                    "h-11 rounded-2xl border border-border text-sm font-medium text-primary/70",
                    gender === option && "border-accent bg-accent text-white"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-primary">생년월일</span>
            <Input
              type="date"
              value={birthDate}
              min={MIN_BIRTH_DATE}
              max={maxBirthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </label>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <Button className="h-11 w-full" onClick={saveProfile} disabled={saving}>
          {saving ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </main>
  );
}

export default function ProfileSetupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-4">
          <p className="text-sm font-medium text-primary/70">
            내 정보 준비 중...
          </p>
        </main>
      }
    >
      <ProfileSetupContent />
    </Suspense>
  );
}
