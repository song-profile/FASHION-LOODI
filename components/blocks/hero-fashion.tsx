"use client";

import { AnimatePresence, motion } from "motion/react";
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
import { cn } from "@/lib/utils";

const valueCards = [
  {
    title: "Daily Outfit Log",
    description: "Capture each look in seconds with clean, structured entries.",
  },
  {
    title: "AI Style Intelligence",
    description: "Understand your patterns, silhouettes, and repeat strengths.",
  },
  {
    title: "Seasonal Closet Clarity",
    description: "Build a smarter wardrobe with weather-aware recommendations.",
  },
];

const carouselItems = [
  "Editorial Looks",
  "Mood Tracking",
  "Smart Tagging",
  "Weekly Recap",
];

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
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [resumeRoute, setResumeRoute] = useState<string | null>(null);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

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

  const openAuth = (mode: "signup" | "login") => {
    setAuthMode(mode);
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

  const handleResume = () => {
    if (!resumeRoute) return;
    router.push(resumeRoute);
  };

  const handleRestart = () => {
    clearOnboardingLocalState();
    setShowResume(false);
  };

  const enterDemo = (path: string) => {
    setAuthOpen(false);
    router.push(path);
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
    <div className="min-h-screen bg-white pb-32">
      <motion.main
        variants={revealContainer}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-md px-4 py-6"
      >
        <motion.header variants={revealItem} className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 px-3 py-1.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-[#f8b3c4]" />
            <span className="font-semibold tracking-tight text-primary">
              LOODI
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary">LOODI</h1>
          <p className="text-base text-primary/70">Your Style, Recorded.</p>
        </motion.header>

        <motion.section variants={revealItem} className="mt-6">
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {carouselItems.map((item, index) => (
              <div
                key={item}
                className="min-w-[220px] snap-start rounded-2xl border border-border/80 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-primary/45">
                  {`0${index + 1}`}
                </p>
                <p className="mt-2 text-sm font-medium text-primary">{item}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section variants={revealItem} className="mt-4 space-y-3">
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

          {valueCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-border/80 bg-white px-4 py-4 shadow-[0_6px_20px_rgba(27,42,74,0.05)]"
            >
              <h2 className="text-sm font-semibold tracking-tight text-primary">
                {card.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-primary/65">
                {card.description}
              </p>
            </article>
          ))}
        </motion.section>
      </motion.main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-md space-y-3">
          <Button className="h-11 w-full" onClick={() => openAuth("signup")}>
            시작하기
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full"
            onClick={() => router.push("/onboarding/style")}
          >
            설문 데모 바로 보기
          </Button>
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="block w-full text-center text-sm text-primary/70 underline-offset-4 hover:underline"
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
                    {authMode === "signup" ? "Sign Up" : "Login"}
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight text-primary">
                    {authMode === "signup"
                      ? "Create your LOODI account"
                      : "Welcome back to LOODI"}
                  </h3>
                </div>

                <div className="grid gap-2">
                  {[
                    { label: "Google로 계속하기", icon: "G" },
                    { label: "Kakao로 계속하기", icon: "K" },
                    { label: "Apple로 계속하기", icon: "A" },
                  ].map((provider) => (
                    <button
                      key={provider.label}
                      type="button"
                      onClick={() =>
                        enterDemo(authMode === "signup" ? "/onboarding/style" : "/home")
                      }
                      className="flex h-11 items-center justify-between rounded-xl border border-border/80 px-4 text-sm font-medium text-primary"
                    >
                      <span>{provider.label}</span>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
                        {provider.icon}
                      </span>
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={handleMockLoginFail}
                  disabled={authMode === "login" && isSubmittingLogin}
                >
                  {authMode === "login" && isSubmittingLogin
                    ? "로그인 중..."
                    : "이메일로 로그인"}
                </Button>

                <Button
                  variant="ghost"
                  className="h-10 w-full text-primary/75"
                  onClick={() => enterDemo("/home")}
                >
                  로그인 없이 둘러보기
                </Button>

                <button
                  type="button"
                  onClick={() =>
                    setAuthMode((prev) =>
                      prev === "signup" ? "login" : "signup"
                    )
                  }
                  className="w-full text-center text-sm text-primary/70 underline-offset-4 hover:underline"
                >
                  {authMode === "signup"
                    ? "이미 계정이 있어요"
                    : "처음이신가요? 회원가입"}
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
