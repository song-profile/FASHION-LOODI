"use client";
import { useEffect, useState } from 'react';
import { BackLink } from '@/components/navigation/back-link';
import { LinkButton } from '@/components/ui/link-button';
import { readAnalysisResult, type AggregatedAnalysis } from '@/lib/onboarding-analysis-images';
import { writeOnboardingLocalState } from '@/lib/onboarding-persistence';

export default function AnalysisResultPage() {
  const [result, setResult] = useState<AggregatedAnalysis | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    writeOnboardingLocalState({ lastStep: 'analysis_result', completed: false });
    setResult(readAnalysisResult()); setReady(true);
  }, []);
  if (!ready) return <main role="status" className="mx-auto max-w-md p-8">분석 결과를 불러오고 있어요.</main>;
  const total = Object.values(result?.styleCounts || {}).reduce((sum, value) => sum + value, 0);
  return <main className="mx-auto min-h-dvh max-w-md space-y-6 px-5 py-6">
    <BackLink href="/onboarding/upload" label="사진 선택으로" />
    <header><p className="diary-label">YOUR STYLE</p><h1 className="mt-3 text-2xl">사진에서 찾은 나의 스타일</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result ? '분석 내용을 확인하고 사진과 함께 기록해 보세요.' : '분석 결과가 없어요. 사진을 다시 선택하거나 분석 없이 기록해 주세요.'}</p></header>
    {result ? <>
      <section className="space-y-4 rounded-3xl border border-border bg-card p-5"><h2 className="text-base">스타일 취향</h2>
        {total ? Object.entries(result.styleCounts).sort((a,b) => b[1]-a[1]).map(([label,count]) => <div key={label}><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{Math.round(count/total*100)}%</span></div><div className="h-1.5 rounded-full bg-soft"><div className="h-full rounded-full bg-accent" style={{ width: `${count/total*100}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">스타일을 특정할 정보가 부족해요.</p>}
      </section>
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5"><h2 className="text-base">사진 속 아이템</h2><div className="flex flex-wrap gap-2">{result.items.length ? result.items.slice(0,8).map((item,index) => <span key={`${item.name}-${index}`} className="rounded-full bg-soft px-3 py-2 text-sm">{item.name}</span>) : <p className="text-sm text-muted-foreground">뚜렷하게 감지된 아이템이 없어요.</p>}</div></section>
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5"><h2 className="text-base">컬러와 분위기</h2><p className="text-sm leading-relaxed text-muted-foreground">{[...result.colors, ...result.moods].join(' · ') || '감지된 정보가 없어요.'}</p>{result.notes.length ? <p className="text-sm leading-relaxed">{result.notes.join(' ')}</p> : null}</section>
    </> : null}
    <LinkButton href="/onboarding/result" className="w-full">{result ? '이 룩 기록하기' : '분석 없이 기록하기'}</LinkButton>
  </main>;
}
