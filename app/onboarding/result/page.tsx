"use client";
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { BackLink } from '@/components/navigation/back-link';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { Textarea } from '@/components/ui/textarea';
import { clearAnalysisResult, clearOutfitPhotos, readAnalysisResult, readOutfitPhotos, toDataUrl, type PendingImage, type AggregatedAnalysis } from '@/lib/onboarding-analysis-images';
import { writeOnboardingLocalState } from '@/lib/onboarding-persistence';
import { appendDiaryEntry, formatDateKey } from '@/lib/outfit-diary';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

export default function OnboardingResultPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PendingImage[]>([]);
  const [analysis, setAnalysis] = useState<AggregatedAnalysis | null>(null);
  const [memo, setMemo] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useUnsavedChanges(photos.length > 0 && !saved);
  useEffect(() => { setPhotos(readOutfitPhotos()); setAnalysis(readAnalysisResult()); setReady(true); }, []);
  const save = () => {
    if (saving || saved || !photos.length) return;
    setSaving(true); setError('');
    const entry = appendDiaryEntry({
      date: formatDateKey(new Date()), photos,
      memo: memo.trim() || undefined,
      styleNote: analysis?.notes.join('\n\n'), items: analysis?.items, colors: analysis?.colors,
      tags: analysis ? [...analysis.seasons, ...analysis.styles.slice(0, 2), ...analysis.moods.slice(0, 2)].filter(Boolean) : [],
    });
    if (!entry) { setSaving(false); setError('저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.'); return; }
    // Once the diary is persisted, optional draft cleanup must not imply failure.
    setSaved(true);
    try { writeOnboardingLocalState({ completed: true, lastStep: 'completed' }); clearOutfitPhotos(); clearAnalysisResult(); } catch { /* The diary has already been saved. */ }
    router.replace('/timeline');
  };
  return <main className="mx-auto min-h-dvh max-w-md space-y-6 px-5 pb-10 pt-6">
    <BackLink href="/onboarding/upload" label="사진 선택으로" />
    <header><p className="diary-label">FIRST PAGE</p><h1 className="mt-3 text-2xl">나의 첫 번째 기록</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">사진과 함께 오늘의 기분을 남겨보세요.</p></header>
    {!ready ? <p role="status" className="text-sm text-muted-foreground">사진을 불러오고 있어요.</p> : !photos.length ? <div className="space-y-4 rounded-3xl border border-border bg-card p-6"><p className="text-sm text-muted-foreground">아직 선택한 사진이 없어요.</p><LinkButton href="/onboarding/upload" className="w-full">사진 선택하기</LinkButton></div> : <>
      <div aria-label="선택한 착장 사진" className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-3xl pb-2">{photos.map((photo,index) => <div key={index} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden rounded-3xl bg-soft"><Image src={toDataUrl(photo)} alt={`선택한 착장 ${index+1}/${photos.length}`} fill unoptimized className="object-contain" /></div>)}</div>
      {photos.length > 1 ? <p className="text-center text-xs text-muted-foreground">옆으로 넘겨 {photos.length}장의 사진을 확인해 보세요.</p> : null}
      <label className="block space-y-3"><span className="text-sm font-medium">오늘의 메모 <span className="text-muted-foreground">· 선택</span></span><Textarea placeholder="이 룩에서 마음에 들었던 점은 무엇인가요?" value={memo} maxLength={2000} onChange={event => setMemo(event.target.value)} /></label>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button className="w-full gap-2" disabled={saving || saved} onClick={save}><Check size={18} />{saved ? '저장했어요' : saving ? '저장 중…' : '나의 첫 룩 저장하기'}</Button>
    </>}
  </main>;
}
