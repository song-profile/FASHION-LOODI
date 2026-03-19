"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleTabs } from "@/components/ui/tabs";
import { recentOutfits } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

export default function TimelinePage() {
  const [view, setView] = useState("grid");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
        dayOffset
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

  return (
    <div className="space-y-5 relative">
      <h1 className="text-2xl font-semibold text-primary">Timeline</h1>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <SimpleTabs
            tabs={[
              { value: "calendar", label: "Calendar View" },
              { value: "grid", label: "Grid View" },
            ]}
            defaultValue="grid"
            onChange={setView}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Weather" />
            <Input placeholder="Mood" />
            <Input placeholder="Style" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>
              {new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
              }).format(currentMonth)}
            </CardTitle>
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
                        1
                      )
                    )
                  }
                  className="h-8 rounded-lg border border-border px-2 text-sm text-primary/75"
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
                        1
                      )
                    )
                  }
                  className="h-8 rounded-lg border border-border px-2 text-sm text-primary/75"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Intl.DateTimeFormat("en-US", { month: "short" }).format(
                        new Date(2026, i, 1)
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
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-primary/55">
                {WEEKDAYS.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = selectedDate ? isSameDay(selectedDate, date) : false;
                  const isToday = isSameDay(new Date(), date);

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setIsDetailOpen(true);
                      }}
                      className={cn(
                        "h-9 rounded-xl border transition",
                        isCurrentMonth
                          ? "border-border text-primary/80"
                          : "border-border/60 text-primary/35",
                        isSelected && "border-primary bg-primary text-white",
                        isToday && !isSelected && "border-primary/40"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {selectedDate ? (
                <p className="text-xs text-primary/65">
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
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentOutfits.map((src) => (
                <div key={src} className="relative h-28 overflow-hidden rounded-xl">
                  <Image src={src} alt="timeline outfit" fill className="object-cover" />
                </div>
              ))}
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
            onClick={() => setIsDetailOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-primary">Outfit Detail</h3>
            <p className="mt-1 text-sm text-primary/65">
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              }).format(selectedDate)}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {recentOutfits.slice(0, 4).map((src) => (
                <div key={src} className="relative h-24 overflow-hidden rounded-xl border border-border">
                  <Image src={src} alt="outfit detail" fill className="object-cover" />
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {["Cloudy", "Calm", "Minimal"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-3 py-1 text-xs text-primary/75"
                >
                  {tag}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
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
