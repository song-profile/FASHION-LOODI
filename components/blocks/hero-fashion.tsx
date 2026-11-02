"use client";
import { PageActions } from "@/components/layout/page-actions";
import { X } from "lucide-react";
import { useDialog } from "@/hooks/use-dialog";

import { postLoginPath } from "@/lib/auth-routing";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Hexagon, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { identifierToAuthEmail } from "@/lib/auth-identifier";
import {
  clearOnboardingLocalState,
  isOnboardingStateStale,
  readOnboardingLocalState,
  stepToRoute,
  writeOnboardingLocalState,
} from "@/lib/onboarding-persistence";
import { isEmailAllowed } from "@/lib/access-control";
import { supabase } from "@/lib/supabase";
import { setCurrentUserStorageId } from "@/lib/user-storage";
import { cn } from "@/lib/utils";

const valueCards = [
  {
    icon: CalendarDays,
    title: "매일의 착장을 기록",
    description: "날씨, 감정, TPO와 함께 타임라인으로",
  },
  {
    icon: Hexagon,
    title: "AI가 분석하는 Style DNA",
    description: "색상, 실루엣, 아이템을 자동 인식",
  },
  {
    icon: Star,
    title: "쌓일수록 정밀해지는 추천",
    description: "맥락 기반 개인화 코디 추천",
  },
];

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

export default function HomePage() {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginError, setShowLoginError] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState(
    "로그인에 실패했어요. 아이디 또는 비밀번호를 다시 확인해 주세요."
  );
  const [resumeRoute, setResumeRoute] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(false);

  const dialogRef = useDialog(authOpen, () => setAuthOpen(false));



  useEffect(() => {
    const redirectSignedInUser = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) return;
      if (!isEmailAllowed(user.email)) {
        await supabase.auth.signOut();
        return;
      }
      setCurrentUserStorageId(user.id);

      const metadata = user.user_metadata ?? {};
      router.replace(postLoginPath(metadata));
    };

    redirectSignedInUser();
  }, [router]);

  useEffect(() => {
    const state = readOnboardingLocalState();
    if (state.completed) return;
    if (isOnboardingStateStale(state)) {
      clearOnboardingLocalState();
      return;
    }
    if (state.lastStep !== "welcome" && state.lastStep !== "completed") {
      setResumeRoute(stepToRoute(state.lastStep));
      setShowResume(true);
    }
    writeOnboardingLocalState({ lastStep: "welcome" });
  }, []);

  const openLogin = () => {
    setAuthOpen(true);
  };

  const routeAfterEmailLogin = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setCurrentUserStorageId(data.user.id);
    if (!isEmailAllowed(data.user?.email)) {
      await supabase.auth.signOut();
      setLoginErrorMessage("초대받은 아이디만 사용할 수 있어요.");
      setShowLoginError(true);
      window.setTimeout(() => setShowLoginError(false), 2600);
      return;
    }
    const metadata = data.user?.user_metadata ?? {};
    router.replace(postLoginPath(metadata));
  };

  const handleEmailLogin = async () => {
    const authEmail = identifierToAuthEmail(email);

    if (!email.trim() || !password) {
      setLoginErrorMessage("아이디와 비밀번호를 입력해 주세요.");
      setShowLoginError(true);
      window.setTimeout(() => setShowLoginError(false), 2600);
      return;
    }

    setIsSubmittingLogin(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    setIsSubmittingLogin(false);

    if (error) {
      setLoginErrorMessage(
        "로그인에 실패했어요. 아이디 또는 비밀번호를 다시 확인해 주세요."
      );
      setShowLoginError(true);
      window.setTimeout(() => setShowLoginError(false), 2600);
      return;
    }

    await routeAfterEmailLogin();
  };

  const handleGoogleLogin = async () => {
    if (process.env.NEXT_PUBLIC_NATIVE_APP === "true") return;
    setIsSubmittingGoogle(true);

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
      setShowLoginError(true);
      window.setTimeout(() => setShowLoginError(false), 2600);
    }
  };

  const handleResume = () => {
    if (!resumeRoute) return;
    router.push(resumeRoute);
  };

  const handleRestart = () => {
    clearOnboardingLocalState();
    setShowResume(false);
  };

  return (
    <div className="min-h-dvh bg-background">
      <main
        className="mx-auto flex min-h-[calc(100dvh-164px)] w-full max-w-md flex-col justify-center px-6 py-8"
      >
        <header className="text-center">
          <h1 className="text-6xl font-semibold tracking-tight text-primary">
            LOODI
          </h1>
          <p className="mt-3 text-base font-medium text-accent">
            Your Style, Recorded.
          </p>
          <p className="mt-5 text-xs font-medium leading-6 text-muted-foreground">
            기록이 쌓일수록, 스타일이 선명해진다.
            <br />
            AI와 함께하는 나만의 패션 다이어리
          </p>
        </header>

        <section className="mt-10 space-y-5">
          {showResume ? (
            <div className="rounded-2xl border border-border bg-soft px-4 py-3">
              <p className="text-sm text-primary/75">
                이전 온보딩 진행 상태를 불러왔어요.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResume}
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  이어서 진행
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="text-sm text-primary/60"
                >
                  처음부터
                </button>
              </div>
            </div>
          ) : null}

          {valueCards.map((card) => {
            const Icon = card.icon;
            return (
            <article
              key={card.title}
              className="flex items-center gap-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-soft text-accent">
                <Icon size={22} strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-primary">
                  {card.title}
                </h2>
                <p className="mt-1 text-sm font-normal leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </article>
            );
          })}
        </section>
      </main>

      <PageActions>
          <Button
            className="h-12 w-full rounded-lg bg-primary text-base font-bold text-white hover:bg-primary/90"
            onClick={() => router.push("/signup")}
          >
            시작하기
          </Button>
          <button
            type="button"
            onClick={openLogin}
            className="flex h-12 w-full items-center justify-center rounded-lg border border-[#d7dce5] bg-white text-sm font-semibold text-primary transition hover:border-primary"
          >
            로그인
          </button>
      </PageActions>

      <AnimatePresence>
        {authOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close auth sheet"
              onClick={() => setAuthOpen(false)}
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-label="로그인" tabIndex={-1}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-lg overflow-y-auto rounded-t-3xl bg-white px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4"
            >
              <div className="mx-auto w-full max-w-md">
                <div className="flex justify-end"><button type="button" aria-label="로그인 닫기" onClick={() => setAuthOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground"><X size={20} /></button></div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/40">
                    LOODI
                  </p>
                  <h3 className="mt-5 text-[26px] font-bold tracking-normal text-primary">
                    로그인
                  </h3>
                  <p className="mt-2 text-sm text-primary/55">
                    기록해둔 스타일 다이어리로 바로 돌아가요.
                  </p>
                </div>

                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    style={process.env.NEXT_PUBLIC_NATIVE_APP === "true" ? { display: "none" } : undefined}
                    onClick={handleGoogleLogin}
                    disabled={isSubmittingGoogle}
                    className="flex h-[52px] items-center justify-between rounded-lg border border-[#d7dce5] px-4 text-sm font-semibold text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      {isSubmittingGoogle
                        ? "Google로 이동 중..."
                        : "Google로 계속하기"}
                    </span>
                    <GoogleMark />
                  </button>
                </div>

                <div className="flex items-center gap-3 py-5">
                  <span className="h-px flex-1 bg-[#eceef2]" />
                  <span className="text-[11px] font-medium text-primary/35">
                    또는
                  </span>
                  <span className="h-px flex-1 bg-[#eceef2]" />
                </div>

                <div className="space-y-3">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-primary/70">
                      아이디
                    </span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-[52px] w-full rounded-lg border border-[#d7dce5] bg-white px-4 text-base text-primary outline-none transition placeholder:text-primary/28 focus:border-primary"
                    placeholder="아이디 입력"
                    type="text"
                    autoComplete="username"
                  />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold text-primary/70">
                      비밀번호
                    </span>
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-[52px] w-full rounded-lg border border-[#d7dce5] bg-white px-4 text-base text-primary outline-none transition placeholder:text-primary/28 focus:border-primary"
                    placeholder="비밀번호 입력"
                    type="password"
                    autoComplete="current-password"
                  />
                  </label>
                  <Button
                    className="h-[52px] w-full rounded-lg bg-primary text-base font-bold text-white hover:bg-primary/90"
                    onClick={handleEmailLogin}
                    disabled={isSubmittingLogin}
                  >
                    {isSubmittingLogin ? "로그인 중..." : "로그인"}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuthOpen(false);
                    router.push("/signup");
                  }}
                  className="mt-4 w-full text-center text-sm font-medium text-primary/55"
                >
                  처음이신가요? 회원가입
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showLoginError ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={cn(
              "fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow"
            )}
          >
            {loginErrorMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
