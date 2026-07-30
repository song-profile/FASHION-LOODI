"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { isEmailAllowed } from "@/lib/access-control";
import { identifierToAuthEmail } from "@/lib/auth-identifier";
import { clearOnboardingLocalState } from "@/lib/onboarding-persistence";
import { clearSurveyDraft } from "@/lib/onboarding-survey-draft";
import { supabase } from "@/lib/supabase";
import { setCurrentUserStorageId } from "@/lib/user-storage";
import { cn } from "@/lib/utils";

type AuthMode = "signup" | "login";

function GoogleMark() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
    </span>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);

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
    if (!isEmailAllowed(data.user?.email)) {
      await supabase.auth.signOut();
      setMessage("초대받은 아이디만 사용할 수 있어요.");
      return;
    }
    const metadata = data.user?.user_metadata ?? {};
    const completedOnboarding = metadata.onboarding_completed === true;
    const hasProfile =
      typeof metadata.nickname === "string" &&
      metadata.nickname.trim().length > 0 &&
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
    const authEmail = identifierToAuthEmail(email);

    if (!email.trim() || !password || !confirmPassword) {
      setMessage("아이디와 비밀번호를 모두 입력해 주세요.");
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

    if (!isEmailAllowed(authEmail)) {
      setMessage("초대받은 아이디만 회원가입할 수 있어요.");
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
      email: authEmail,
      password,
      options: {
        data: {
          login_id: email.trim(),
          onboarding_completed: false,
          privacy_agreed: true,
          privacy_agreed_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setSubmitting(false);
      setMessage("회원가입에 실패했어요. 아이디와 비밀번호를 다시 확인해 주세요.");
      return;
    }

    if (data.user) setCurrentUserStorageId(data.user.id);
    if (!isEmailAllowed(data.user?.email)) {
      await supabase.auth.signOut();
      setSubmitting(false);
      setMessage("초대받은 아이디만 회원가입할 수 있어요.");
      return;
    }

    if (data.session) {
      router.replace("/profile/setup?next=%2Fonboarding%2Fstyle");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: authEmail,
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
    const authEmail = identifierToAuthEmail(email);

    if (!email.trim() || !password) {
      setMessage("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    setSubmitting(false);

    if (error) {
      setMessage("로그인에 실패했어요. 아이디 또는 비밀번호를 다시 확인해 주세요.");
      return;
    }

    await routeAfterLogin();
  };

  const handleGoogleLogin = async () => {
    setIsSubmittingGoogle(true);
    setMessage("");

    const nextPath = "/home";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setIsSubmittingGoogle(false);
      setMessage("Google 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="min-h-screen bg-white px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col">
        <header className="pt-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/45"
          >
            LOODI
          </button>
          <h1 className="mt-8 text-[28px] font-bold leading-tight tracking-normal text-primary">
            {isSignup ? "계정 만들기" : "로그인"}
          </h1>
          <p className="mt-2 text-sm text-primary/55">
            {isSignup
              ? "아이디로 가입하고 스타일 프로필을 이어서 설정해요."
              : "기록해둔 스타일 다이어리로 바로 돌아가요."}
          </p>
        </header>

        <section className="mt-10 flex rounded-lg bg-[#f4f4f5] p-1">
          {[
            { value: "signup", label: "회원가입" },
            { value: "login", label: "로그인" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => openMode(tab.value as AuthMode)}
              className={cn(
                "h-11 flex-1 rounded-md text-sm font-semibold transition",
                mode === tab.value
                  ? "bg-white text-primary shadow-[0_2px_10px_rgba(20,27,43,0.08)]"
                  : "text-primary/45"
              )}
            >
              {tab.label}
            </button>
          ))}
        </section>

        <section className="mt-7 space-y-3">
          {mode === "login" ? (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmittingGoogle}
                className="flex h-13 w-full items-center justify-between rounded-lg border border-[#d7dce5] bg-white px-4 text-sm font-semibold text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  {isSubmittingGoogle ? "Google로 이동 중..." : "Google로 계속하기"}
                </span>
                <GoogleMark />
              </button>
              <div className="flex items-center gap-3 py-2">
                <span className="h-px flex-1 bg-[#eceef2]" />
                <span className="text-[11px] font-medium text-primary/35">
                  또는
                </span>
                <span className="h-px flex-1 bg-[#eceef2]" />
              </div>
            </>
          ) : null}

          <label className="block space-y-2">
            <span className="text-xs font-semibold text-primary/70">아이디</span>
            <input
              className="h-13 w-full rounded-lg border border-[#d7dce5] bg-white px-4 text-[15px] text-primary outline-none transition placeholder:text-primary/28 focus:border-primary"
              placeholder="아이디 입력"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold text-primary/70">
              비밀번호
            </span>
            <input
              className="h-13 w-full rounded-lg border border-[#d7dce5] bg-white px-4 text-[15px] text-primary outline-none transition placeholder:text-primary/28 focus:border-primary"
              placeholder="비밀번호 입력"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {isSignup ? (
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-primary/70">
                비밀번호 확인
              </span>
              <input
                className="h-13 w-full rounded-lg border border-[#d7dce5] bg-white px-4 text-[15px] text-primary outline-none transition placeholder:text-primary/28 focus:border-primary"
                placeholder="비밀번호 다시 입력"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          ) : null}

          {isSignup ? (
            <label className="mt-2 flex items-start gap-3 rounded-lg bg-[#f7f7f8] px-4 py-3 text-sm leading-5 text-primary/70">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(event) => setPrivacyAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                개인정보 수집 및 이용 동의
                <span className="block text-xs text-primary/42">
                  계정 생성과 서비스 이용을 위해 아이디 정보를 저장합니다.
                </span>
              </span>
            </label>
          ) : null}

          {message ? (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
              {message}
            </p>
          ) : null}
        </section>

        <div className="mt-auto space-y-3 pb-2 pt-8">
          <Button
            className="h-13 w-full rounded-lg bg-primary text-base font-bold text-white hover:bg-primary/90"
            onClick={isSignup ? handleSignup : handleLogin}
            disabled={submitting}
          >
            {submitting
              ? isSignup
                ? "계정 만드는 중..."
                : "로그인 중..."
              : isSignup
                ? "회원가입"
                : "로그인"}
          </Button>
          <button
            type="button"
            onClick={() => openMode(isSignup ? "login" : "signup")}
            className="h-11 w-full text-center text-sm font-medium text-primary/55"
          >
            {isSignup ? "이미 계정이 있어요" : "처음이신가요? 회원가입"}
          </button>
        </div>
      </div>
    </main>
  );
}
