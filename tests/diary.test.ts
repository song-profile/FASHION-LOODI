import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDiaryBackup, parseDiaryBackup, serializeDiaryBackup } from '../lib/diary-backup';
import { scoreEntryStyles } from '../lib/home-insights';
import { appendDiaryEntry, restoreDiaryEntries, type DiaryEntry } from '../lib/outfit-diary';
import { recordDraftSchema } from '../lib/record-draft';

const entry: DiaryEntry = { id: 'first', date: '2026-10-28', createdAt: '2026-10-28T10:00:00Z', photos: [{ mediaType: 'image/jpeg', base64: '/9j/4AAQ' }], tags: ['가을', 'Minimal', 'Casual'], title: '나의 룩', memo: '기억하고 싶은 하루' };

test('backup round trip preserves photographs, Korean notes and dates', () => {
  assert.deepEqual(parseDiaryBackup(serializeDiaryBackup([entry])), [entry]);
});
test('invalid backups reject impossible dates, SVG, malformed data and unsupported versions', () => {
  const backup = JSON.parse(serializeDiaryBackup([entry]));
  for (const invalid of [null, [], { ...backup, version: 2 }, { ...backup, entries: [{ ...entry, date: '2026-02-31' }] }, { ...backup, entries: [{ ...entry, photos: [{ mediaType: 'image/svg+xml', base64: 'PHN2Zz4=' }] }] }, { ...backup, entries: [{ ...entry, photos: [{ mediaType: 'image/png', base64: '/9j/4AAQ' }] }] }]) {
    assert.throws(() => parseDiaryBackup(JSON.stringify(invalid)));
  }
});
test('restore adds new entries once and never replaces edits with old copies', () => {
  const updated = { ...entry, memo: '수정한 기록' };
  const second = { ...entry, id: 'second' };
  const merged = mergeDiaryBackup([updated], [entry, second, second]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(item => item.id === 'first')?.memo, '수정한 기록');
  assert.deepEqual(mergeDiaryBackup(merged, [entry, second]), merged);
});
test('English style tags are recognized and seasons are never classified as styles', () => {
  assert.deepEqual([...scoreEntryStyles(entry).keys()].sort(), ['Casual', 'Minimal']);
  assert.equal(scoreEntryStyles({ ...entry, tags: ['가을'] }).size, 0);
  assert.deepEqual([...scoreEntryStyles({ ...entry, colors: ['브라운'], items: [{ category: '상의', name: '데님 셔츠' }] }).keys()].sort(), ['Casual', 'Minimal']);
});
test('corrupt existing storage and full storage cannot be overwritten by restore', () => {
  const values = new Map<string, string>([['loodi_current_user_id', 'test'], ['loodi_outfit_diary:test', '{broken']]);
  let full = false;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (full) throw new Error('full'); values.set(key, value); },
  } } });
  try {
    assert.throws(() => restoreDiaryEntries([entry]));
    assert.equal(appendDiaryEntry(entry), null);
    assert.equal(values.get('loodi_outfit_diary:test'), '{broken');
    const original = JSON.stringify([entry]); values.set('loodi_outfit_diary:test', original); full = true;
    assert.throws(() => restoreDiaryEntries([{ ...entry, id: 'second' }]));
    assert.equal(values.get('loodi_outfit_diary:test'), original);
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});
test('draft validation rejects broken dates and retains the complete manual entry', () => {
  const draft = { version: 1, photo: entry.photos[0], date: entry.date, title: '수동 기록', memo: '메모', tags: 'Minimal', colors: '화이트', weather: '☀️', temperature: 20, mood: '🙂', step: 3, analysis: null };
  assert.deepEqual(recordDraftSchema.parse(draft), draft);
  assert.equal(recordDraftSchema.safeParse({ ...draft, date: 'broken' }).success, false);
});
