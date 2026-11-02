"use client";
import { ScreenHeader } from "@/components/layout/screen-header";
import { useDialog } from "@/hooks/use-dialog";

import { ArrowLeft, ArrowRight, Plus, Search, Pencil, Trash2, X } from "lucide-react";
import Image from "next/image";
import { createPortal } from 'react-dom';
import { LinkButton } from '@/components/ui/link-button';
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleTabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteDiaryEntry,
  diaryPhotoToDataUrl,
  formatDateKey,
  readDiaryEntries,
  updateDiaryEntry,
  type DiaryEntry,
} from "@/lib/outfit-diary";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const moodIconMap: Record<string, string> = {
  보통: "🙂",
  멋짐: "😎",
  피곤: "😴",
  기쁜: "😊",
  화난: "😡",
  슬픔: "😢",
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a: Date, b: Date) {

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function moodDisplay(value?: string) {
  if (!value) return "-";
  return moodIconMap[value] ?? value;
}

export default function TimelinePage() {
  const [view, setView] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTags, setDraftTags] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftMemo, setDraftMemo] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const date = params.get('date') || params.get('focus');
    setJustSaved(params.get('saved') === '1');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const selected = new Date(`${date}T12:00:00`);
      if (!Number.isNaN(selected.getTime()) && formatDateKey(selected) === date) { setSelectedDate(selected); setCurrentMonth(startOfMonth(selected)); setIsDetailOpen(Boolean(params.get('date'))); }
    }
    setEntries(readDiaryEntries());
  }, []);

  const refreshEntries = () => setEntries(readDiaryEntries());

  const startEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setDraftTitle(entry.title ?? "");
    setDraftTags(entry.tags.join(", "));
    setDraftNote(entry.styleNote ?? "");
    setDraftMemo(entry.memo ?? "");
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
    setDraftTags("");
    setDraftNote("");
    setDraftMemo("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const tags = draftTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const updated = updateDiaryEntry(editingId, {
      title: draftTitle.trim() || undefined,
      tags,
      styleNote: draftNote.trim() || undefined,
      memo: draftMemo.trim() || undefined,
    });
    if (!updated) { setActionError("변경사항을 저장하지 못했어요. 저장 공간을 확인하고 다시 시도해 주세요."); return; }
    setActionError("");
    refreshEntries();
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    if (!deleteDiaryEntry(id)) { setActionError("기록을 삭제하지 못했어요. 다시 시도해 주세요."); return; }
    setActionError("");
    refreshEntries();
    if (editingId === id) cancelEdit();
    setConfirmDeleteId(null);
  };

  const closeDetailModal = () => {
    if (editingId && !window.confirm("수정 중인 내용이 있어요. 저장하지 않고 닫을까요?")) return;
    setIsDetailOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('date');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    setActionError("");
    cancelEdit();
    setConfirmDeleteId(null);
  };

  const dialogRef = useDialog(isDetailOpen, closeDetailModal);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startWeekday = monthStart.getDay();
    const totalDaysInMonth = monthEnd.getDate();

    const totalCells = Math.ceil((startWeekday + totalDaysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }).map((_, idx) => {
      const dayOffset = idx - startWeekday + 1;
      const cellDate = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        dayOffset,
      );
      return {
        date: cellDate,
        isCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
      };
    });
  }, [currentMonth]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [...new Set([...Array.from({ length: 11 }, (_, idx) => now - 5 + idx), currentMonth.getFullYear(), ...entries.map(entry => Number(entry.date.slice(0, 4)))])].sort((a, b) => a - b);
  }, [currentMonth, entries]);

  const selectedEntries = selectedDate
    ? entriesByDate.get(formatDateKey(selectedDate)) ?? []
    : [];
  const visibleEntries = entries.filter(entry => [entry.title, entry.memo, entry.styleNote, entry.date, ...entry.tags, ...(entry.items || []).map(item => item.name)].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const moveMonth = (offset: number) => setCurrentMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <div className="relative space-y-5">
      <section className="space-y-3">
        <ScreenHeader eyebrow="THE PERSONAL ARCHIVE" title="나의 기록" description="지나간 하루의 옷차림을 다시 만나요." action={<span className="rounded-full border border-border bg-card px-3 py-1.5 text-[10px] text-muted-foreground">{entries.length} LOOKS</span>} />
      </section>
      {justSaved ? <p role="status" className="rounded-xl bg-highlight/10 px-4 py-3 text-xs text-highlight">오늘의 룩을 저장했어요. 기록에서 다시 꺼내보세요.</p> : null}

      <div>
          <SimpleTabs
            tabs={[
              { value: "calendar", label: "달력" },
              { value: "grid", label: "모아보기" },
            ]}
            defaultValue="calendar"
            onChange={setView}
          />
      </div>
      {view === 'grid' ? <label className="relative block"><Search size={16} className="absolute left-4 top-3.5 text-muted-foreground" /><Input aria-label="기록 검색" className="pl-11" placeholder="제목, 태그, 아이템으로 찾아보기" value={query} onChange={event => setQuery(event.target.value)} /></label> : null}

      <Card className={cn("diary-surface", view === "calendar" ? "overflow-hidden" : undefined)}>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/40">
                {view === 'calendar' ? 'MONTHLY LOOKS' : 'COLLECTED MOMENTS'}
              </p>
              <CardTitle className="mt-1 text-xl">
                {view === 'grid' ? `나만의 룩북 · ${visibleEntries.length}` : new Intl.DateTimeFormat("ko-KR", {
                  month: "long",
                  year: "numeric",
                }).format(currentMonth)}
              </CardTitle>
            </div>
            {view === "calendar" ? (
              <div className="flex items-center gap-2">
                <select
                  aria-label="연도 선택"
                  value={currentMonth.getFullYear()}
                  onChange={(e) =>
                    setCurrentMonth(
                      new Date(
                        Number(e.target.value),
                        currentMonth.getMonth(),
                        1,
                      ),
                    )
                  }
                  className="h-10 rounded-2xl border border-border bg-white px-3 text-sm font-medium text-primary shadow-[0_4px_14px_rgba(27,42,74,0.06)] outline-none transition focus:border-accent"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="월 선택"
                  value={currentMonth.getMonth()}
                  onChange={(e) =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        Number(e.target.value),
                        1,
                      ),
                    )
                  }
                  className="h-10 rounded-2xl border border-border bg-white px-3 text-sm font-medium text-primary shadow-[0_4px_14px_rgba(27,42,74,0.06)] outline-none transition focus:border-accent"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Intl.DateTimeFormat("ko-KR", { month: "short" }).format(
                        new Date(2026, i, 1),
                      )}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {view === "calendar" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border"><ArrowLeft size={17} /></button><button type="button" onClick={() => { const today = new Date(); setCurrentMonth(startOfMonth(today)); setSelectedDate(today); }} className="min-h-11 px-4 text-xs text-accent">오늘로</button><button type="button" aria-label="다음 달" onClick={() => moveMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-border"><ArrowRight size={17} /></button></div>
              <div className="grid grid-cols-7 gap-1 rounded-lg border border-border bg-card/75 px-2 py-2 text-center text-[10px] font-semibold uppercase text-primary/45">
                {WEEKDAYS.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = selectedDate ? isSameDay(selectedDate, date) : false;
                  const isToday = isSameDay(new Date(), date);
                  const dayEntries = entriesByDate.get(formatDateKey(date)) ?? [];
                  const hasEntry = dayEntries.length > 0;

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      aria-label={`${formatDateKey(date)}${hasEntry ? `, ${dayEntries.length}개의 기록` : ', 기록 없음'}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedDate(date);
                        setIsDetailOpen(true);
                      }}
                      className={cn(
                        "relative flex min-h-12 aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-lg border text-xs font-medium transition-colors",
                        isCurrentMonth
                          ? "border-border bg-card/90 text-primary shadow-[0_4px_12px_rgba(27,42,74,0.04)] hover:border-accent/50"
                          : "border-transparent bg-soft/45 text-primary/30",
                        hasEntry && !isSelected && "border-highlight/30 bg-highlight/10",
                        isToday && !isSelected && "border-primary/50 ring-2 ring-primary/10",
                        isSelected &&
                          "border-primary bg-primary text-white shadow-[0_10px_20px_rgba(27,42,74,0.18)]",
                      )}
                    >
                      {hasEntry && dayEntries[0].photos[0] ? <><Image src={diaryPhotoToDataUrl(dayEntries[0].photos[0])} alt="" fill unoptimized className="object-cover" /><span className="absolute inset-0 bg-black/25" /></> : null}
                      <span className={cn('relative z-[1]', hasEntry && dayEntries[0].photos[0] && 'font-semibold text-white')}>{date.getDate()}</span>
                      {hasEntry && dayEntries.length > 1 ? (
                        <span
                          className={cn(
                            "absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-accent text-white",
                          )}
                        >
                          {dayEntries.length}
                        </span>
                      ) : null}
                      {hasEntry ? (
                        <span
                          className={cn(
                            "absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                            isSelected
                              ? "bg-white"
                              : "bg-highlight",
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {selectedDate ? (
                <p className="rounded-2xl bg-soft px-3 py-2 text-xs font-medium text-primary/65">
                  {new Intl.DateTimeFormat("ko-KR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  }).format(selectedDate)}
                </p>
              ) : null}
            </div>
          ) : visibleEntries.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {visibleEntries.map((entry) => {
                const cover = entry.photos[0];
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      const [y, m, d] = entry.date.split("-").map(Number);
                      setSelectedDate(new Date(y, m - 1, d));
                      setIsDetailOpen(true);
                    }}
                    className="lookbook-card"
                  >
                    {cover ? (
                      <Image
                        src={diaryPhotoToDataUrl(cover)}
                        alt={`outfit ${entry.date}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-soft" />
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 pt-8 text-left text-white"><span className="block text-xs font-medium">{entry.title || '오늘의 룩'}</span><span className="mt-1 block text-[10px] text-white/80">
                      {entry.date.slice(5).replace('-', '.')}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-primary/55">
                {query ? '검색한 기록이 없어요. 다른 단어로 찾아보세요.' : '아직 저장된 룩이 없어요. 첫 번째 페이지를 채워볼까요?'}
              </p>
              {query ? <button type="button" className="min-h-11 text-sm text-accent" onClick={() => setQuery('')}>검색 초기화</button> : <LinkButton href="/record" className="gap-2"><Plus size={16} />첫 룩 기록하기</LinkButton>}
            </div>
          )}
        </CardContent>
      </Card>

      {isDetailOpen && selectedDate ? createPortal(
        <>
          <button
            type="button"
            aria-label="상세 배경 닫기"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeDetailModal}
          />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="착장 상세" tabIndex={-1} className="sheet-enter fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-border bg-card px-5 py-3">
              <h3 className="text-lg font-semibold text-primary">착장 상세</h3>
              <button type="button" aria-label="착장 상세 닫기" onClick={closeDetailModal} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground"><X size={20} /></button>
            </div>
            {actionError ? <p role="alert" className="mt-3 text-sm text-destructive">{actionError}</p> : null}
            <p className="mt-1 text-sm text-primary/65">
              {new Intl.DateTimeFormat("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              }).format(selectedDate)}
            </p>

            {selectedEntries.length > 0 ? (
              <div className="mt-4 space-y-5">
                {selectedEntries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  const isConfirmingDelete = confirmDeleteId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className="space-y-2 rounded-2xl border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-primary">
                            {entry.title || "오늘의 룩"}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-primary/45">
                            {new Intl.DateTimeFormat("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(entry.createdAt))}
                            {entry.updatedAt ? " · edited" : ""}
                          </p>
                        </div>
                        {!isEditing && !isConfirmingDelete ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              aria-label="기록 수정"
                              onClick={() => startEdit(entry)}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-primary/65 hover:bg-soft"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              aria-label="기록 삭제"
                              onClick={() => setConfirmDeleteId(entry.id)}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-soft p-3 text-xs text-primary/70">
                        <div>
                          <p className="text-primary/45">저장 시간</p>
                          <p className="mt-1 font-medium text-primary">
                            {new Intl.DateTimeFormat("ko-KR", {
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(new Date(entry.createdAt))}
                          </p>
                        </div>
                        <div>
                          <p className="text-primary/45">날씨</p>
                          <p className="mt-1 font-medium text-primary">
                            {entry.weather ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-primary/45">무드</p>
                          <p className="mt-1 font-medium text-primary">
                            {moodDisplay(entry.mood)}
                          </p>
                        </div>
                      </div>

                      <div className={cn('grid gap-2', entry.photos.length > 1 && 'grid-cols-2')}>
                        {entry.photos.slice(0, 4).map((photo, idx) => (
                          <div
                            key={`${entry.id}-${idx}`}
                            className="relative aspect-[3/4] max-h-80 overflow-hidden rounded-xl border border-border bg-soft"
                          >
                            <Image
                              src={diaryPhotoToDataUrl(photo)}
                              alt={`outfit ${entry.date}`}
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                        ))}
                      </div>

                      {isConfirmingDelete ? (
                        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                          <p className="text-xs text-rose-700">
                            이 기록을 삭제할까요? 되돌릴 수 없습니다.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.id)}
                              className="min-h-11 flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white"
                            >
                              삭제
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-11 flex-1 rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-700"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary/50">
                              Title
                            </label>
                            <Input
                              aria-label="기록 제목"
                              maxLength={100}
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              placeholder="오늘의 룩 제목"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary/50">
                              Tags (comma-separated)
                            </label>
                            <Input
                              aria-label="기록 태그"
                              maxLength={500}
                              value={draftTags}
                              onChange={(e) => setDraftTags(e.target.value)}
                              placeholder="e.g. 가을, 캐주얼, 차분한"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary/50">
                              Style Note
                            </label>
                            <Textarea
                              rows={3}
                              aria-label="분석 메모"
                              maxLength={10000}
                              value={draftNote}
                              onChange={(e) => setDraftNote(e.target.value)}
                              placeholder="AI 분석 내용 또는 직접 작성"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary/50">
                              Memo
                            </label>
                            <Textarea
                              rows={2}
                              aria-label="개인 메모"
                              maxLength={2000}
                              value={draftMemo}
                              onChange={(e) => setDraftMemo(e.target.value)}
                              placeholder="개인 메모"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="min-h-11 flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="min-h-11 flex-1 rounded-lg border border-border px-3 py-2 text-xs text-primary/75"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {entry.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {entry.tags.map((tag) => (
                                <span
                                  key={`${entry.id}-${tag}`}
                                  className="rounded-full border border-border px-3 py-1 text-xs text-primary/75"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {entry.styleNote ? (
                            <p className="whitespace-pre-line rounded-xl bg-soft p-3 text-xs leading-relaxed text-primary/70">
                              {entry.styleNote}
                            </p>
                          ) : null}
                          {entry.memo ? (
                            <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-primary/65">
                              <p className="mb-1 font-medium text-primary">
                                내용
                              </p>
                              <p className="whitespace-pre-line">{entry.memo}</p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border bg-soft/70 p-4 text-sm text-primary/55">
                이 날에는 기록이 없어요.{formatDateKey(selectedDate) <= formatDateKey(new Date()) ? <LinkButton href={`/record?date=${formatDateKey(selectedDate)}`} variant="outline" className="mt-3 w-full">이 날짜에 룩 기록하기</LinkButton> : null}
              </p>
            )}

            <button
              type="button"
              onClick={closeDetailModal}
              className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
            >
              닫기
            </button>
          </div>
        </>, document.body
      ) : null}
    </div>
  );
}
