"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Hexagon, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  clearOnboardingLocalState,
  isOnboardingStateStale,
  readOnboardingLocalState,
  stepToRoute,
  writeOnboardingLocalState,
} from "@/lib/onboarding-persistence";
import { supabase } from "@/lib/supabase";
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

const revealContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

export default function HomePage() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [resumeRoute, setResumeRoute] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const redirectSignedInUser = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) return;

      const metadata = user.user_metadata ?? {};
      const hasProfile =
        typeof metadata.full_name === "string" &&
        metadata.full_name.trim().length > 0 &&
        typeof metadata.gender === "string" &&
        metadata.gender.trim().length > 0 &&
        typeof metadata.birth_date === "string" &&
        metadata.birth_date.trim().length > 0;

      router.replace(
        hasProfile ? "/home" : "/profile/setup?next=%2Fhome"
      );
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

  const handleMockLoginFail = () => {
    setIsSubmittingLogin(true);
    window.setTimeout(() => {
      setIsSubmittingLogin(false);
      setShowLoginError(true);
      window.setTimeout(() => setShowLoginError(false), 2600);
    }, 700);
  };

  const handleGoogleLogin = async () => {
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

  if (booting) {
    return (
      <div className="min-h-screen bg-white px-4 py-6">
        <div className="mx-auto w-full max-w-md space-y-3">
          <div className="h-6 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <motion.main
        variants={revealContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-md flex-col justify-center px-8 py-10"
      >
        <motion.header variants={revealItem} className="text-center">
          <h1 className="font-serif text-7xl font-black tracking-tight text-primary">
            LOODI
          </h1>
          <p className="mt-3 font-serif text-xl font-semibold italic text-accent">
            Your Style, Recorded.
          </p>
          <p className="mt-5 text-xs font-medium leading-6 text-muted-foreground">
            기록이 쌓일수록, 스타일이 선명해진다.
            <br />
            AI와 함께하는 나만의 패션 다이어리
          </p>
        </motion.header>

        <motion.section variants={revealItem} className="mt-16 space-y-6">
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
              <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-soft text-accent">
                <Icon size={28} strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-primary">
                  {card.title}
                </h2>
                <p className="mt-1 text-base font-semibold leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </article>
            );
          })}
        </motion.section>
      </motion.main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md space-y-3">
          <Button
            variant="outline"
            className="h-11 w-full border-border bg-card text-primary"
            onClick={() => router.push("/onboarding/style")}
          >
            시작하기
          </Button>
          <button
            type="button"
            onClick={openLogin}
            className="flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-card text-sm font-medium text-muted-foreground transition hover:border-accent/35 hover:text-accent"
          >
            이미 계정이 있어요
          </button>
        </div>
      </div>

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
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-4 pb-7 pt-5"
            >
              <div className="mx-auto w-full max-w-md space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary/45">
                    Login
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight text-primary">
                    Welcome back to LOODI
                  </h3>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmittingGoogle}
                    className="flex h-11 items-center justify-between rounded-xl border border-border/80 px-4 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      {isSubmittingGoogle
                        ? "Google로 이동 중..."
                        : "Google로 계속하기"}
                    </span>
                    <GoogleMark />
                  </button>
                </div>

                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={handleMockLoginFail}
                  disabled={isSubmittingLogin}
                >
                  {isSubmittingLogin ? "로그인 중..." : "이메일로 로그인"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthOpen(false);
                    router.push("/onboarding/style");
                  }}
                  className="w-full text-center text-sm text-primary/70 underline-offset-4 hover:underline"
                >
                  처음이신가요? 시작하기
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
            로그인에 실패했어요. 이메일 또는 비밀번호를 다시 확인해 주세요.
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
