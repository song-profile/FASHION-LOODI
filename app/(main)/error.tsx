"use client";
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="flex min-h-[60dvh] flex-col items-center justify-center px-5 text-center">
    <span className="mb-6 rounded-2xl bg-accent/10 p-4 text-accent"><RefreshCw size={24} /></span>
    <h1 className="text-2xl font-semibold">잠시 멈췄어요</h1>
    <p className="mb-7 mt-3 text-sm leading-relaxed text-muted-foreground">화면을 불러오지 못했어요.<br />다시 시도하거나 홈으로 돌아가 주세요.</p>
    <div className="flex gap-3"><Button onClick={reset}>다시 시도</Button><Link className={buttonVariants({ variant: 'outline' })} href="/home">홈으로</Link></div>
  </section>;
}
