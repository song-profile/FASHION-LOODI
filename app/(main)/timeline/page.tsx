"use client";

import { BookOpen, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
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
import { recentOutfits } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
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
    updateDiaryEntry(editingId, {
      title: draftTitle.trim() || undefined,
      tags,
      styleNote: draftNote.trim() || undefined,
      memo: draftMemo.trim() || undefined,
    });
    refreshEntries();
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    deleteDiaryEntry(id);
    refreshEntries();
    if (editingId === id) cancelEdit();
    setConfirmDeleteId(null);
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    cancelEdit();
    setConfirmDeleteId(null);
  };

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
    return Array.from({ length: 11 }).map((_, idx) => now - 5 + idx);
  }, []);

  const selectedEntries = selectedDate
    ? entriesByDate.get(formatDateKey(selectedDate)) ?? []
    : [];

  return (
    <div className="relative space-y-5">
      <section className="diary-surface rounded-lg border border-border px-4 py-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="diary-label">LOODI DIARY</span>
            <h1 className="mt-3 text-2xl font-semibold text-primary">Timeline</h1>
            <p className="mt-1 text-sm text-primary/60">
              오늘의 옷, 날씨, 기분을 한 페이지에 모아봐요.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card text-accent shadow-soft">
            <BookOpen size={22} />
          </div>
        </div>
      </section>

      <Card className="diary-surface">
        <CardContent className="space-y-3 pt-5">
          <SimpleTabs
            tabs={[
              { value: "calendar", label: "Calendar View" },
              { value: "grid", label: "Grid View" },
            ]}
            defaultValue="calendar"
            onChange={setView}
          />
        </CardContent>
      </Card>

      <Card className={cn("diary-surface", view === "calendar" ? "overflow-hidden" : undefined)}>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/40">
                Outfit Calendar
              </p>
              <CardTitle className="mt-1 text-xl">
                {new Intl.DateTimeFormat("en-US", {
                  month: "long",
                  year: "numeric",
                }).format(currentMonth)}
              </CardTitle>
            </div>
            {view === "calendar" ? (
              <div className="flex items-center gap-2">
                <select
                  aria-label="Select year"
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
                  aria-label="Select month"
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
                      {new Intl.DateTimeFormat("en-US", { month: "short" }).format(
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
                      onClick={() => {
                        setSelectedDate(date);
                        setIsDetailOpen(true);
                      }}
                      className={cn(
                        "relative flex h-11 flex-col items-center justify-center rounded-lg border text-sm font-medium transition",
                        isCurrentMonth
                          ? "border-border bg-card/90 text-primary shadow-[0_4px_12px_rgba(27,42,74,0.04)] hover:border-accent/50"
                          : "border-transparent bg-soft/45 text-primary/30",
                        hasEntry && !isSelected && "border-highlight/30 bg-highlight/10",
                        isToday && !isSelected && "border-primary/50 ring-2 ring-primary/10",
                        isSelected &&
                          "border-primary bg-primary text-white shadow-[0_10px_20px_rgba(27,42,74,0.18)]",
                      )}
                    >
                      <span>{date.getDate()}</span>
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
                  Selected:{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  }).format(selectedDate)}
                </p>
              ) : null}
            </div>
          ) : entries.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {entries.map((entry) => {
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
                    className="relative h-28 overflow-hidden rounded-lg border border-card bg-card shadow-soft"
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
                    <span className="absolute bottom-1 left-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                      {entry.date.slice(5)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-primary/55">
                아직 저장된 룩이 없어요. Record 탭에서 첫 룩을 기록해 보세요.
              </p>
              <div className="grid grid-cols-3 gap-2 opacity-60">
                {recentOutfits.slice(0, 3).map((src) => (
                  <div key={src} className="relative h-28 overflow-hidden rounded-xl">
                    <Image src={src} alt="sample" fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isDetailOpen && selectedDate ? (
        <>
          <button
            type="button"
            aria-label="Close detail modal"
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closeDetailModal}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-primary">Outfit Detail</h3>
            <p className="mt-1 text-sm text-primary/65">
              {new Intl.DateTimeFormat("en-US", {
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
                            {entry.title || "Untitled Outfit"}
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
                              aria-label="Edit entry"
                              onClick={() => startEdit(entry)}
                              className="rounded-lg p-1.5 text-primary/65 hover:bg-soft"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete entry"
                              onClick={() => setConfirmDeleteId(entry.id)}
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 size={14} />
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

                      <div className="grid grid-cols-2 gap-2">
                        {entry.photos.slice(0, 4).map((photo, idx) => (
                          <div
                            key={`${entry.id}-${idx}`}
                            className="relative h-24 overflow-hidden rounded-xl border border-border"
                          >
                            <Image
                              src={diaryPhotoToDataUrl(photo)}
                              alt={`outfit ${entry.date}`}
                              fill
                              unoptimized
                              className="object-cover"
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
                              className="flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              삭제
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700"
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
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              placeholder="Quick note title"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary/50">
                              Tags (comma-separated)
                            </label>
                            <Input
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
                              value={draftMemo}
                              onChange={(e) => setDraftMemo(e.target.value)}
                              placeholder="개인 메모"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs text-primary/75"
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
                이 날에는 기록이 없어요.
              </p>
            )}

            <button
              type="button"
              onClick={closeDetailModal}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white"
            >
              Close
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
