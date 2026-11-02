"use client";
import { useState } from 'react';
import { Sparkles } from "lucide-react";
import { LinkButton } from '@/components/ui/link-button';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { categoryIcons, categoryStyles, type ClosetCategory, type RecordedClosetGroup } from "@/lib/closet-model";
export function ClosetGroups({ groups }: { groups: RecordedClosetGroup[] }) {
  const [category, setCategory] = useState('전체');
  const visible = groups.filter(group => category === '전체' ? group.items.length > 0 : group.category === category);
  return <>
      <div className="space-y-3"><h2 className="text-base font-semibold">나의 아이템</h2><div role="group" aria-label="아이템 카테고리" className="flex gap-2 overflow-x-auto pb-2">{['전체', ...groups.map(group => group.category)].map(label => <button key={label} type="button" aria-pressed={category === label} onClick={() => setCategory(label)} className={`min-h-11 shrink-0 rounded-full border px-4 text-xs transition-colors ${category === label ? 'border-primary bg-primary text-white' : 'border-border bg-card text-muted-foreground'}`}>{label}</button>)}</div></div>
      {visible.length === 0 ? <Card><CardContent className="space-y-3 pt-5"><p className="text-sm font-medium">매일의 룩이 옷장을 채워요.</p><p className="text-xs leading-6 text-muted-foreground">사진을 분석하거나 메모에 아이템을 남겨보세요. 자주 입는 옷을 모아드려요.</p><LinkButton href="/record" variant="outline" className="w-full">첫 아이템 기록하기</LinkButton></CardContent></Card> : null}
      {visible.map((group) => {
        const Icon = categoryIcons[group.category as ClosetCategory];
        const style = categoryStyles[group.category as ClosetCategory];
        const topUsed = Math.max(...group.items.map((item) => item.used), 1);
        return (
          <Card key={group.category} className="diary-surface overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  {Icon ? (
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${style.surface} text-primary`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  ) : null}
                  <span>
                    {group.category}
                    <span className="mt-0.5 block text-xs font-medium text-primary/45">
                      {group.items.length} pieces
                    </span>
                  </span>
                </CardTitle>
                <span className={`h-8 w-2 rounded-full ${style.accent}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.length > 0 ? (
                group.items.map((item, index) => (
                  <div
                    key={`${group.category}-${item.name}`}
                    className="rounded-lg border border-border bg-card/90 p-3 shadow-[0_8px_20px_rgba(28,44,70,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-soft text-[11px] font-semibold text-primary/60">
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-semibold text-primary">
                            {item.name}
                          </p>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-soft">
                          <div
                            className={`h-full rounded-full ${style.rail}`}
                            style={{
                              width: `${Math.max(18, Math.round((item.used / topUsed) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <Badge className="shrink-0 border border-border bg-soft text-primary">
                        {item.used}회
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-soft/70 p-4 text-sm text-primary/55">
                  <div className="mb-2 flex items-center gap-2 text-primary">
                    <Sparkles size={15} className="text-accent" />
                    <span className="font-semibold">{style.label} 비어 있음</span>
                  </div>
                  착장 기록에서 아이템이 발견되면 자동으로 채워져요.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
</>; }
