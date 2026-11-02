import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { signedIn } from './fixtures';
import { serializeDiaryBackup } from '../../lib/diary-backup';
import type { DiaryEntry } from '../../lib/outfit-diary';

const userId = '11111111-1111-4111-8111-111111111111';
const diaryKey = `loodi_outfit_diary:${userId}`;
const photo = { mediaType: 'image/png', base64: readFileSync('public/hero-model.jpg').toString('base64') };
const entry: DiaryEntry = { id: 'backup-look', date: '2026-10-28', createdAt: '2026-10-28T10:00:00Z', title: '가을의 니트', photos: [photo], tags: ['가을', 'Minimal', 'Casual'], colors: ['아이보리', '버건디'], items: [{ category: '상의', name: '아이보리 니트' }] };

test('manual entry resumes across navigation and reload, then saves once on the selected date', async ({ page }) => {
  await signedIn(page);
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/record?date=2026-10-28');
  await page.locator('input[type=file]').last().setInputFiles('public/hero-model.jpg');
  await page.getByRole('button', { name: '분석 없이 기록', exact: true }).click();
  await page.getByRole('textbox', { name: '룩 제목', exact: true }).fill('이어서 쓰는 가을 룩');
  await page.getByRole('textbox', { name: '룩 메모', exact: true }).fill('아이보리 니트와 함께');
  await page.getByRole('textbox', { name: '스타일 태그', exact: true }).fill('Minimal, Casual');
  await page.getByRole('textbox', { name: '착장 컬러', exact: true }).fill('아이보리, 네이비');
  await page.getByRole('navigation').getByRole('link', { name: '홈', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: '룩 추가', exact: true }).click();
  await expect(page.getByText('작성하던 룩을 이어서 기록해요.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '룩 제목', exact: true })).toHaveValue('이어서 쓰는 가을 룩');
  await page.reload();
  await expect(page.getByLabel('기록 날짜', { exact: true })).toHaveValue('2026-10-28');
  await expect(page.getByRole('textbox', { name: '스타일 태그', exact: true })).toHaveValue('Minimal, Casual');
  await page.getByRole('button', { name: '룩 저장하기' }).click();
  await expect(page).toHaveURL(/timeline\?focus=2026-10-28&saved=1/);
  await expect(page.getByRole('status')).toContainText('저장했어요');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), diaryKey);
  expect(saved).toHaveLength(1); expect(saved[0].date).toBe('2026-10-28');
  await page.getByRole('navigation').getByRole('link', { name: '스타일', exact: true }).click();
  await expect(page.getByText('1. Casual', { exact: true })).toBeVisible();
  await expect(page.getByText('2. Minimal', { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: '룩 추가', exact: true }).click();
  await expect(page.getByRole('button', { name: '사진 선택하기' })).toBeVisible();
});

test('backup imports with review, refreshes closet, exports and deduplicates safely', async ({ page }) => {
  await signedIn(page);
  await page.goto('/closet');
  const file = { name: 'loodi.json', mimeType: 'application/json', buffer: Buffer.from(serializeDiaryBackup([entry])) };
  const upload = page.getByLabel('백업 파일', { exact: true });
  await upload.setInputFiles(file);
  await expect(page.getByText('백업에 1개의 기록이 있어요.', { exact: false })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), diaryKey)).toBeNull();
  await page.getByRole('button', { name: '기록 복원하기' }).click();
  await expect(page.getByRole('status')).toContainText('1개의 새 기록');
  await expect(page.getByText('아이보리 니트', { exact: true })).toBeVisible();
  await upload.setInputFiles(file);
  await page.getByRole('button', { name: '기록 복원하기' }).click();
  await expect(page.getByRole('status')).toContainText('0개의 새 기록');
  await upload.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert').filter({ hasText: '올바른 LOODI 백업 파일' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]').length, diaryKey)).toBe(1);
  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }));
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '기록 내보내기' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^loodi-backup-.*\.json$/);
  const backup = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(backup.entries).toHaveLength(1); expect(backup.entries[0].title).toBe(entry.title);
});

test('lookbook search, date navigation and detail deletion work with the overlay above navigation', async ({ page }) => {
  await signedIn(page);
  await page.goto('/home');
  await page.evaluate(({ key, entry }) => localStorage.setItem(key, JSON.stringify([entry])), { key: diaryKey, entry });
  await page.getByRole('navigation').getByRole('link', { name: '기록', exact: true }).click();
  const month = await page.getByLabel('월 선택').inputValue();
  await page.getByRole('button', { name: '이전 달', exact: true }).click();
  expect(await page.getByLabel('월 선택').inputValue()).toBe(String((Number(month) + 11) % 12));
  await page.getByRole('button', { name: '모아보기', exact: true }).click();
  await page.getByRole('textbox', { name: '기록 검색' }).fill('없는 룩');
  await expect(page.getByText('검색한 기록이 없어요. 다른 단어로 찾아보세요.')).toBeVisible();
  await page.getByRole('button', { name: '검색 초기화' }).click();
  await page.getByRole('button').filter({ has: page.getByAltText('outfit 2026-10-28') }).click();
  const dialog = page.getByRole('dialog', { name: '착장 상세' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await dialog.getByRole('button', { name: '기록 삭제', exact: true }).click();
  await dialog.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(dialog.getByText('이 날에는 기록이 없어요.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]').length, diaryKey)).toBe(0);
});

test('a failed profile photo write preserves the previous picture and displays an error', async ({ page }) => {
  await signedIn(page); await page.goto('/closet');
  await expect(page.getByRole('button', { name: '프로필 사진 설정' })).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key.startsWith('loodi_profile_photo:')) throw new DOMException('Full', 'QuotaExceededError'); original.call(this, key, value); };
  });
  await page.locator('input[accept="image/*"]').setInputFiles('public/hero-model.jpg');
  await expect(page.getByRole('alert').filter({ hasText: '사진을 저장하지 못했어요.' })).toBeVisible();
  await expect(page.getByAltText('프로필 사진', { exact: true })).toHaveCount(0);
});
