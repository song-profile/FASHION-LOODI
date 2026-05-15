"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clearOnboardingLocalState } from "@/lib/onboarding-persistence";
import { clearSurveyDraft } from "@/lib/onboarding-survey-draft";
import { supabase } from "@/lib/supabase";
import { setCurrentUserStorageId } from "@/lib/user-storage";

type AuthMode = "signup" | "login" | null;

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPrivacyAgreed(false);
    setMessage("");
  };

  const routeAfterLogin = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setCurrentUserStorageId(data.user.id);
    const metadata = data.user?.user_metadata ?? {};
    const completedOnboarding = metadata.onboarding_completed === true;
    const hasProfile =
      typeof metadata.full_name === "string" &&
      metadata.full_name.trim().length > 0 &&
      typeof metadata.gender === "string" &&
      metadata.gender.trim().length > 0 &&
      typeof metadata.birth_date === "string" &&
      metadata.birth_date.trim().length > 0;

    if (!hasProfile) {
      router.replace(
        `/profile/setup?next=${encodeURIComponent(
          completedOnboarding ? "/home" : "/onboarding/style"
        )}`
      );
      return;
    }

    router.replace(completedOnboarding ? "/home" : "/onboarding/style");
  };

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setMessage("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (password.length < 6) {
      setMessage("비밀번호는 최소 6자 이상이어야 해요.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("비밀번호가 서로 달라요.");
      return;
    }

    if (!privacyAgreed) {
      setMessage("회원가입을 위해 개인정보 수집 및 이용에 동의해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    clearOnboardingLocalState();
    clearSurveyDraft();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          onboarding_completed: false,
          privacy_agreed: true,
          privacy_agreed_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setSubmitting(false);
      setMessage("회원가입에 실패했어요. 이메일과 비밀번호를 다시 확인해 주세요.");
      return;
    }

    if (data.user) setCurrentUserStorageId(data.user.id);

    if (data.session) {
      router.replace("/profile/setup?next=%2Fonboarding%2Fstyle");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (loginError) {
      setMessage(
        "회원가입은 됐지만 바로 로그인되지 않았어요. Supabase Auth에서 이메일 인증을 꺼야 바로 시작할 수 있어요."
      );
      return;
    }

    router.replace("/profile/setup?next=%2Fonboarding%2Fstyle");
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (error) {
      setMessage("로그인에 실패했어요. 이메일 또는 비밀번호를 다시 확인해 주세요.");
      return;
    }

    await routeAfterLogin();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center bg-background px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/45">
            {mode === "login" ? "Login" : "Sign up"}
          </p>
          <CardTitle className="text-2xl">LOODI 계정 만들기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode ? (
            <>
              <input
                className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-primary outline-none transition focus:border-accent"
                placeholder="이메일"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-primary outline-none transition focus:border-accent"
                placeholder="비밀번호"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {mode === "signup" ? (
                <>
                  <input
                    className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-primary outline-none transition focus:border-accent"
                    placeholder="비밀번호 확인"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <label className="flex items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm leading-5 text-primary/70">
                    <input
                      type="checkbox"
                      checked={privacyAgreed}
                      onChange={(event) => setPrivacyAgreed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-accent"
                    />
                    <span>
                      개인정보 수집 및 이용에 동의합니다.
                      <span className="block text-xs text-primary/45">
                        계정 생성과 서비스 이용을 위해 이메일 정보를 저장합니다.
                      </span>
                    </span>
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          {message ? (
            <p className="rounded-2xl bg-soft px-4 py-3 text-sm leading-6 text-primary/70">
              {message}
            </p>
          ) : null}

          {mode === "signup" ? (
            <Button className="h-11 w-full" onClick={handleSignup} disabled={submitting}>
              {submitting ? "계정 만드는 중..." : "회원가입하고 시작하기"}
            </Button>
          ) : null}

          {mode === null ? (
            <Button className="h-11 w-full" onClick={() => openMode("signup")}>
              회원가입하고 시작하기
            </Button>
          ) : null}

          {mode === "login" ? (
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={handleLogin}
              disabled={submitting}
            >
              {submitting ? "로그인 중..." : "로그인하기"}
            </Button>
          ) : null}

          <button
            type="button"
            onClick={() => openMode(mode === "login" ? "signup" : "login")}
            className="block w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "login" ? "처음이신가요? 시작하기" : "이미 계정이 있어요"}
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
