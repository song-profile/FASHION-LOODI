"use client";
import { ScreenHeader } from "@/components/layout/screen-header";

import { Capacitor } from '@capacitor/core';
import { ArrowLeft, Camera, ImagePlus, Loader2, Check, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PageActions } from '@/components/layout/page-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { compressImageForUpload, type SingleAnalysis } from '@/lib/onboarding-analysis-images';
import { takeNativePhoto } from '@/lib/native';
import { appendDiaryEntry, formatDateKey, type DiaryPhoto } from '@/lib/outfit-diary';
import { scopedLocalStorageKey } from '@/lib/user-storage';
import { RECORD_DRAFT_KEY, recordDraftSchema } from '@/lib/record-draft';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const moods = [{ icon: '🙂', label: '보통' }, { icon: '😊', label: '기쁜' }, { icon: '😎', label: '멋짐' }, { icon: '😴', label: '피곤' }];
const weather = [{ icon: '☀️', label: '맑음' }, { icon: '☁️', label: '흐림' }, { icon: '🌧️', label: '비' }, { icon: '❄️', label: '눈' }];

export default function RecordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [analysis, setAnalysis] = useState<SingleAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedWeather, setSelectedWeather] = useState('☀️');
  const [temperature, setTemperature] = useState(20);
  const [mood, setMood] = useState('🙂');
  const [date, setDate] = useState(() => formatDateKey(new Date()));
  const [tags, setTags] = useState('');
  const [colors, setColors] = useState('');
  const [photo, setPhoto] = useState<DiaryPhoto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [draftError, setDraftError] = useState('');
  const cameraInput = useRef<HTMLInputElement>(null);
  const albumInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  const selection = useRef(0);
  useUnsavedChanges(Boolean(file) && !saved);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => { request.current?.abort(); selection.current += 1; }, []);
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);

  useEffect(() => {
    try {
      const requestedDate = new URL(window.location.href).searchParams.get('date');
      if (requestedDate && recordDraftSchema.shape.date.safeParse(requestedDate).success && requestedDate <= formatDateKey(new Date())) setDate(requestedDate);
      const raw = sessionStorage.getItem(scopedLocalStorageKey(RECORD_DRAFT_KEY));
      if (raw) {
        const draft = recordDraftSchema.parse(JSON.parse(raw));
        const bytes = Uint8Array.from(atob(draft.photo.base64), char => char.charCodeAt(0));
        setFile(new File([bytes], 'draft.jpg', { type: draft.photo.mediaType }));
        setPhoto(draft.photo); setDate(draft.date); setTitle(draft.title); setMemo(draft.memo);
        setTags(draft.tags); setColors(draft.colors); setSelectedWeather(draft.weather);
        setTemperature(draft.temperature); setMood(draft.mood); setAnalysis(draft.analysis);
        setStep(draft.step === 2 && !draft.analysis ? 1 : draft.step); setResumed(true);
      }
    } catch { setDraftError('임시 기록을 불러오지 못했어요. 사진을 다시 선택해 주세요.'); }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady || !photo || saved) return;
    try {
      sessionStorage.setItem(scopedLocalStorageKey(RECORD_DRAFT_KEY), JSON.stringify({ version: 1, photo, date, title, memo, tags, colors, weather: selectedWeather, temperature, mood, step, analysis }));
      setDraftError('');
    } catch { setDraftError('임시 저장 공간이 부족해요. 이 화면에서 기록을 완료해 주세요.'); }
  }, [draftReady, photo, date, title, memo, tags, colors, selectedWeather, temperature, mood, step, analysis, saved]);

  const selectFile = async (next?: File) => {
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(next.type)) { setError('JPG, PNG, WEBP 또는 GIF 사진을 선택해 주세요.'); return; }
    if (next.size > MAX_IMAGE_BYTES) { setError('사진은 5MB 이하로 선택해 주세요.'); return; }
    const id = ++selection.current;
    request.current?.abort(); setAnalyzing(false); setPreparing(true); setError('');
    try {
      const compressed = await compressImageForUpload(next);
      if (id !== selection.current) return;
      setPhoto(compressed); setFile(next); setAnalysis(null); setStep(1);
    } catch { if (id === selection.current) setError('사진을 읽지 못했어요. 다른 사진으로 시도해 주세요.'); }
    finally { if (id === selection.current) setPreparing(false); }
  };
  const takePhoto = async () => {
    if (!Capacitor.isNativePlatform()) { cameraInput.current?.click(); return; }
    try { selectFile(await takeNativePhoto() || undefined); }
    catch (error) { if (!(error instanceof Error && /cancel/i.test(error.message))) setError('카메라 권한을 확인하거나 앨범에서 사진을 선택해 주세요.'); }
  };
  const cancelAnalysis = () => { request.current?.abort(); setAnalyzing(false); setError(''); setStep(1); };
  const runAnalysis = async () => {
    if (!file || analyzing || preparing) return;
    const controller = new AbortController(); request.current = controller;
    setStep(2); setAnalyzing(true); setAnalysis(null); setError('');
    try {
      const image = await compressImageForUpload(file, 1024, 0.78);
      if (controller.signal.aborted) return;
      const response = await authenticatedFetch('/api/analyze-outfit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: image.base64, mediaType: image.mediaType }), signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '분석하지 못했어요. 다시 시도해 주세요.');
      if (!controller.signal.aborted) {
        const result = recordDraftSchema.shape.analysis.safeParse(body);
        if (!result.success || !result.data) throw new Error('분석 결과를 읽지 못했어요. 다시 분석하거나 직접 기록해 주세요.');
        setAnalysis(result.data);
        if (!tags) setTags([...result.data.style, ...result.data.mood].join(', '));
        if (!colors) setColors(result.data.colors.join(', '));
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '분석하지 못했어요.');
    } finally { if (!controller.signal.aborted) setAnalyzing(false); }
  };
  const save = async () => {
    if (!file || saveLock.current) return;
    saveLock.current = true; setSaving(true); setError('');
    try {
      if (!recordDraftSchema.shape.date.safeParse(date).success || date > formatDateKey(new Date())) throw new Error('오늘 또는 이전 날짜를 선택해 주세요.');
      const photo = await compressImageForUpload(file);
      const split = (value: string) => [...new Set(value.split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 30);
      const entry = appendDiaryEntry({ date, photos: [photo], title: title.trim() || '오늘의 룩', memo: memo.trim() || undefined, weather: `${selectedWeather} ${temperature}°C`, temperature, mood, items: analysis?.items || [], colors: split(colors), styleNote: analysis?.description, tags: [...new Set([...(analysis?.season ? [analysis.season] : []), ...split(tags)])] });
      if (!entry) throw new Error('기록을 저장하지 못했어요. 저장 공간과 기존 기록을 확인한 뒤 다시 시도해 주세요.');
      try { sessionStorage.removeItem(scopedLocalStorageKey(RECORD_DRAFT_KEY)); } catch { /* The diary itself was saved successfully. */ }
      setSaved(true); router.replace(`/timeline?focus=${date}&saved=1`);
    } catch (error) { setError(error instanceof Error ? error.message : '저장하지 못했어요.'); saveLock.current = false; setSaving(false); }
  };
  const nextStep = () => { setError(''); setStep(3); };
  const discardDraft = () => {
    if (!window.confirm('작성하던 임시 기록을 지우고 새로 시작할까요?')) return;
    try { sessionStorage.removeItem(scopedLocalStorageKey(RECORD_DRAFT_KEY)); }
    catch { setError('임시 기록을 삭제하지 못했어요. 다시 시도해 주세요.'); return; }
    request.current?.abort(); selection.current += 1;
    setFile(null); setPhoto(null); setAnalysis(null); setAnalyzing(false); setPreparing(false);
    setTitle(''); setMemo(''); setTags(''); setColors(''); setDate(formatDateKey(new Date()));
    setSelectedWeather('☀️'); setTemperature(20); setMood('🙂');
    setStep(1); setResumed(false); setError(''); setDraftError('');
  };

  return <div className="space-y-5">
    {resumed ? <div className="flex items-center gap-2 rounded-xl bg-highlight/10 px-4 py-2 text-xs text-highlight"><p role="status" className="flex-1">작성하던 룩을 이어서 기록해요.</p><button type="button" disabled={saving} onClick={discardDraft} className="min-h-11 shrink-0 px-2 underline underline-offset-4">새로 쓰기</button></div> : null}
    {draftError ? <p role="alert" className="text-xs text-destructive">{draftError}</p> : null}
    <div>
      <ScreenHeader eyebrow="MY DAILY LOOK" title="오늘의 룩 기록" description={step === 1 ? '오늘의 나를 담은 한 장을 남겨보세요.' : step === 2 ? '사진 속 아이템과 색상을 정리해요.' : '마지막으로 오늘의 이야기를 더해보세요.'} action={<span className="text-xs tabular-nums text-muted-foreground">{step} / 3</span>} />
      <ol aria-label="기록 단계" className="record-progress">{['사진', '분석', '메모'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
      {step > 1 && !analyzing ? <button type="button" disabled={saving} onClick={() => { setError(''); setStep(step === 3 && !analysis ? 1 : step - 1); }} className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs text-muted-foreground"><ArrowLeft size={14} />이전 단계</button> : null}
    </div>
    <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ''; }} />
    <input ref={albumInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ''; }} />

    {step === 1 ? <section className="space-y-4">
      <button type="button" onClick={() => albumInput.current?.click()} aria-label={preview ? '사진 바꾸기' : '사진 선택하기'} className="record-upload">
        {preview ? <span className="relative h-full w-full"><Image src={preview} alt="선택한 착장 사진" fill unoptimized className="object-contain" /></span> : <><span className="mb-1 flex h-16 w-16 items-center justify-center rounded-[20px] bg-white text-accent shadow-soft"><ImagePlus size={28} strokeWidth={1.4} /></span><span className="text-base font-semibold">오늘의 룩, 한 장으로</span><span className="text-xs text-muted-foreground">전신이 잘 보이는 사진이면 좋아요.</span></>}
      </button>
      <div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={takePhoto} className="gap-2"><Camera size={18} />사진 촬영</Button><Button variant="outline" onClick={() => albumInput.current?.click()} className="gap-2"><ImagePlus size={18} />앨범에서 선택</Button></div>
      <p className="text-center text-[11px] text-muted-foreground">{preview ? "사진을 누르면 다른 사진으로 바꿀 수 있어요." : "JPG, PNG, WEBP, GIF · 최대 5MB"}</p>
    </section> : null}

    {step === 2 ? <section className="space-y-4">
      {preview ? <div className="relative h-[min(28dvh,200px)] overflow-hidden rounded-2xl bg-soft"><Image src={preview} alt="분석할 착장 사진" fill unoptimized className="object-contain" /></div> : null}
      {analyzing ? <div role="status" className="flex items-center gap-3 rounded-2xl bg-card p-5"><Loader2 size={20} className="animate-spin text-accent" /><div><p className="text-sm font-medium">사진을 분석하고 있어요</p><p className="mt-1 text-xs text-muted-foreground">잠시만 기다려 주세요.</p></div></div> : analysis ? <div className="space-y-4 rounded-2xl border border-border bg-card p-5"><p className="text-sm font-semibold">분석을 마쳤어요</p><p className="text-sm leading-relaxed text-muted-foreground">{analysis.description}</p><div className="flex flex-wrap gap-2">{[...analysis.items.map(item => item.name), ...analysis.colors].map((label,index) => <span key={`${label}-${index}`} className="rounded-full bg-soft px-3 py-1.5 text-xs">{label}</span>)}</div></div> : null}
    </section> : null}

    {step === 3 ? <section className="space-y-5">
      <label className="block space-y-2"><span className="text-sm font-medium">기록 날짜</span><Input type="date" aria-label="기록 날짜" max={formatDateKey(new Date())} value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="block space-y-2"><span className="text-sm font-medium">룩 제목 <span className="text-muted-foreground">· 선택</span></span><Input aria-label="룩 제목" placeholder="예: 가벼운 셔츠를 입은 날" value={title} maxLength={100} onChange={event => setTitle(event.target.value)} /></label>
      <label className="block space-y-2"><span className="text-sm font-medium">오늘의 메모 <span className="text-muted-foreground">· 선택</span></span><Textarea aria-label="룩 메모" placeholder="오늘의 기분이나 기억하고 싶은 것" value={memo} maxLength={2000} onChange={event => setMemo(event.target.value)} /></label>
      <label className="block space-y-2"><span className="text-sm font-medium">스타일 태그 <span className="text-muted-foreground">· 선택</span></span><Input aria-label="스타일 태그" placeholder="미니멀, 캐주얼, 차분한" maxLength={500} value={tags} onChange={event => setTags(event.target.value)} /><span className="block text-[11px] text-muted-foreground">쉼표로 구분해 주세요. 나의 스타일 분석에도 반영돼요.</span></label>
      <label className="block space-y-2"><span className="text-sm font-medium">착장 컬러 <span className="text-muted-foreground">· 선택</span></span><Input aria-label="착장 컬러" placeholder="화이트, 네이비" maxLength={500} value={colors} onChange={event => setColors(event.target.value)} /></label>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">날씨</legend><div className="grid grid-cols-4 gap-2">{weather.map(item => <button key={item.icon} type="button" aria-pressed={selectedWeather === item.icon} onClick={() => setSelectedWeather(item.icon)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-xs ${selectedWeather === item.icon ? 'border-accent bg-accent/5 text-accent' : 'border-border bg-card text-muted-foreground'}`}><span className="text-xl">{item.icon}</span>{item.label}</button>)}</div></fieldset>
      <label className="flex min-h-12 items-center justify-between gap-4 text-sm"><span>기온</span><select aria-label="기온 선택" value={temperature} onChange={event => setTemperature(Number(event.target.value))} className="h-12 min-w-28 rounded-xl border border-border bg-card px-3 text-base">{Array.from({length:61},(_,i)=>i-15).map(value=><option key={value} value={value}>{value}°C</option>)}</select></label>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">오늘의 기분</legend><div className="grid grid-cols-4 gap-2">{moods.map(item => <button key={item.icon} type="button" aria-pressed={mood === item.icon} onClick={() => setMood(item.icon)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-xs ${mood === item.icon ? 'border-accent bg-accent/5 text-accent' : 'border-border bg-card text-muted-foreground'}`}><span className="text-xl">{item.icon}</span>{item.label}</button>)}</div></fieldset>
    </section> : null}

    <PageActions aboveNav>
      {error ? <p role="alert" className="text-sm leading-relaxed text-destructive">{error}</p> : null}
      {step === 1 ? <><Button className="w-full gap-2" disabled={!file || preparing} onClick={runAnalysis}>{preparing ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}{preparing ? '사진 준비 중…' : 'AI로 착장 분석하기'}</Button>{file ? <Button variant="ghost" className="w-full" disabled={preparing} onClick={nextStep}>분석 없이 기록</Button> : null}</> : step === 2 ? analyzing ? <><Button className="w-full gap-2" disabled><Loader2 className="animate-spin" size={17} />분석 중…</Button><Button variant="ghost" className="w-full" onClick={cancelAnalysis}>사진 선택으로 돌아가기</Button></> : analysis ? <Button className="w-full" onClick={nextStep}>메모 남기기</Button> : <><Button className="w-full" onClick={runAnalysis}>다시 분석하기</Button><Button variant="ghost" className="w-full" disabled={preparing} onClick={nextStep}>분석 없이 기록</Button></> : <Button className="w-full gap-2" disabled={!file || saving || saved} onClick={save}>{saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}{saved ? '저장했어요' : saving ? '저장 중…' : '룩 저장하기'}</Button>}
    </PageActions>
  </div>;
}
