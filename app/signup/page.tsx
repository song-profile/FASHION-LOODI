"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isEmailAllowed } from "@/lib/access-control";
import { identifierToAuthEmail } from "@/lib/auth-identifier";
import { clearOnboardingLocalState } from "@/lib/onboarding-persistence";
import { clearSurveyDraft } from "@/lib/onboarding-survey-draft";
import { supabase } from "@/lib/supabase";
import { setCurrentUserStorageId } from "@/lib/user-storage";

type AuthMode = "signup" | "login" | null;

function GoogleMark() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-soft">
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
  const [mode, setMode] = useState<AuthMode>(null);
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
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmittingGoogle}
                  className="flex h-11 w-full items-center justify-between rounded-2xl border border-border bg-white px-4 text-sm font-medium text-primary transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {isSubmittingGoogle ? "Google로 이동 중..." : "Google로 계속하기"}
                  </span>
                  <GoogleMark />
                </button>
              ) : null}
              <input
                className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-primary outline-none transition focus:border-accent"
                placeholder="아이디"
                type="text"
                autoComplete="username"
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
                        계정 생성과 서비스 이용을 위해 아이디 정보를 저장합니다.
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
