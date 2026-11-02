"use client";

import { useRef, useState } from 'react';
import { Download, Upload, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MAX_BACKUP_BYTES, parseDiaryBackup, serializeDiaryBackup } from '@/lib/diary-backup';
import { formatDateKey, readDiaryEntries, restoreDiaryEntries, type DiaryEntry } from '@/lib/outfit-diary';

export function DiaryBackupPanel({ onRestore }: { onRestore: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<DiaryEntry[] | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setError(''); setMessage('');
    try {
      const entries = readDiaryEntries();
      if (!entries.length) throw new Error('백업할 기록이 아직 없어요.');
      const file = new File([serializeDiaryBackup(entries)], `loodi-backup-${formatDateKey(new Date())}.json`, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'LOODI 기록 백업' });
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a'); link.href = url; link.download = file.name;
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
      setMessage(`${entries.length}개의 기록을 백업 파일로 내보냈어요.`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : '백업 파일을 만들지 못했어요.');
    }
  };

  const selectBackup = async (file?: File) => {
    if (!file) return;
    setError(''); setMessage(''); setPending(null); setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('백업 파일은 20MB 이하로 선택해 주세요.');
      setPending(parseDiaryBackup(await file.text()));
    } catch (err) { setError(err instanceof Error ? err.message : '백업 파일을 읽지 못했어요.'); }
    finally { setBusy(false); }
  };

  const restore = () => {
    if (!pending) return;
    try {
      const count = restoreDiaryEntries(pending);
      setPending(null); setError(''); setMessage(`${count}개의 새 기록을 복원했어요. 중복 기록은 그대로 유지했어요.`);
      onRestore();
    } catch { setError('복원하지 못했어요. 저장 공간이나 기존 기록을 확인해 주세요. 기존 기록은 유지됩니다.'); }
  };

  return <Card><CardContent className="space-y-4 pt-5">
    <div className="flex items-center gap-2"><Archive size={18} className="text-accent" /><h2 className="text-sm font-semibold">소중한 기록, 안전하게</h2></div>
    <p className="text-xs leading-6 text-muted-foreground">기록은 이 기기에 저장돼요. 사진과 메모가 담긴 백업 파일을 보관하고, 다른 브라우저에서도 불러올 수 있어요.</p>
    <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="gap-2 text-xs" onClick={download}><Download size={15} />기록 내보내기</Button><Button variant="outline" className="gap-2 text-xs" disabled={busy} onClick={() => input.current?.click()}><Upload size={15} />{busy ? '파일 확인 중' : '백업 불러오기'}</Button></div>
    <input ref={input} aria-label="백업 파일" type="file" accept="application/json,.json" className="hidden" onChange={event => { void selectBackup(event.target.files?.[0]); event.target.value = ''; }} />
    {pending ? <div className="space-y-3 rounded-xl bg-soft p-4"><p className="text-xs leading-6">백업에 {pending.length}개의 기록이 있어요. 현재 계정에 없는 기록만 추가합니다.</p><div className="flex gap-2"><Button className="flex-1 text-xs" onClick={restore}>기록 복원하기</Button><Button variant="ghost" onClick={() => setPending(null)}>취소</Button></div></div> : null}
    {message ? <p role="status" className="text-xs leading-6 text-highlight">{message}</p> : null}
    {error ? <p role="alert" className="text-xs leading-6 text-destructive">{error}</p> : null}
  </CardContent></Card>;
}
