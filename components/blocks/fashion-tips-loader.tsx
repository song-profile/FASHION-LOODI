"use client";

import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const FASHION_TIPS = [
  "💡 보라는 노랑·머스타드와 매치하면 톤이 살아요.",
  "🧥 아우터는 안에 입은 상의보다 1톤 어둡게 입어보세요.",
  "👖 와이드 팬츠엔 짧은 상의로 비율을 살리세요.",
  "🎨 한 룩에 메인 색은 최대 3개까지가 깔끔해요.",
  "🌧️ 비 오는 날엔 쨍한 색 한 포인트로 무드 전환!",
  "🧶 니트 + 셔츠 레이어드는 가을 베이직 공식이에요.",
  "👟 신발은 옷의 하단 색과 맞추면 키가 더 커 보여요.",
  "🪞 LOODI는 매일 기록할수록 추천이 더 정확해져요.",
  "📸 같은 룩이라도 자연광에서 찍으면 분석이 정확해요.",
  "🔁 스트릭 7일 채우면 새로운 스타일 인사이트가 열려요.",
];

const FEATURE_HINTS = [
  "💜 Closet 탭에서 자주 쓴 아이템 통계를 볼 수 있어요.",
  "🤖 문의하기 챗봇이 앱 사용법을 도와드려요.",
  "🛍️ 추천 카드의 무신사·크림·에이블리 버튼으로 바로 쇼핑!",
  "📊 DNA 탭에서 내 스타일 분포를 확인할 수 있어요.",
];

const ALL_MESSAGES = [...FASHION_TIPS, ...FEATURE_HINTS];

function pickRandomIndex(exclude: number) {
  if (ALL_MESSAGES.length <= 1) return 0;
  let next = Math.floor(Math.random() * ALL_MESSAGES.length);
  while (next === exclude) {
    next = Math.floor(Math.random() * ALL_MESSAGES.length);
  }
  return next;
}

export function FashionTipsLoader({
  intervalMs = 3500,
  className = "",
}: {
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * ALL_MESSAGES.length));
    const id = window.setInterval(() => {
      setIndex((prev) => pickRandomIndex(prev));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return (
    <div
      className={`flex items-start gap-2 rounded-2xl bg-soft/80 px-4 py-3 text-sm text-primary/80 ${className}`}
    >
      <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-highlight" />
      <div className="relative min-h-[2.6em] flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {ALL_MESSAGES[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
