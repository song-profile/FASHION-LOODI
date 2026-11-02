import { test, expect } from '@playwright/test';
import { signedIn } from './fixtures';

test('landing login sheet has focus containment, Escape and focus restoration', async ({ page }) => {
  await page.goto('/');
  const login = page.getByRole('button', { name: '로그인', exact: true }).first();
  await login.click();
  const dialog = page.getByRole('dialog', { name: '로그인' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(login).toBeFocused();
  await page.screenshot({ path: 'artifacts/ui/landing.png', fullPage: true });
});

test('main tabs preserve active state and fit a phone without horizontal overflow', async ({ page }) => {
  await signedIn(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: '오늘의 코디', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '오늘의 코디 추천받기' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/ui/home.png', fullPage: true });
  const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
  for (const [name, path] of [['기록', '/timeline'], ['룩 추가', '/record'], ['스타일', '/dna'], ['옷장', '/closet'], ['홈', '/home']]) {
    await navigation.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(navigation.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/ui/${path.slice(1)}.png`, fullPage: true });
  }
  await navigation.getByRole('link', { name: '룩 추가', exact: true }).click();
  await page.screenshot({ path: 'artifacts/ui/record.png', fullPage: true });
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('survey goes forward and back while retaining choices', async ({ page }) => {
  await signedIn(page, false);
  await page.goto('/onboarding/style');
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  await page.getByText('Casual', { exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/color$/);
  await page.getByRole('link', { name: '뒤로', exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/style$/);
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/ui/survey.png', fullPage: true });
});

test('analysis failure allows manual recording and failed storage never shows success', async ({ page }) => {
  await signedIn(page);
  await page.route('**/api/analyze-outfit', route => route.fulfill({ status: 400, json: { error: '사진을 분석하지 못했어요.' } }));
  await page.goto('/record');
  page.on('dialog', dialog => dialog.accept());
  await page.locator('input[type=file]').last().setInputFiles('docs/assets/readme/home-recommendation.jpeg');
  await page.getByRole('button', { name: 'AI로 착장 분석하기' }).click();
  await page.getByRole('button', { name: '분석 없이 기록' }).click();
  await page.getByRole('textbox', { name: '룩 제목' }).fill('오늘의 룩');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key.startsWith('loodi_outfit_diary:')) throw new DOMException('Full', 'QuotaExceededError'); original.call(this, key, value); };
  });
  await page.getByRole('button', { name: '룩 저장하기' }).click();
  await expect(page.getByRole('alert').filter({ hasText: '저장 공간' })).toBeVisible();
  await expect(page).toHaveURL(/\/record$/);
  await expect(page.getByText('오늘의 룩을 저장했어요', { exact: true })).not.toBeVisible();
});

test('leaving an unsaved outfit can be cancelled', async ({ page }) => {
  await signedIn(page);
  await page.goto('/record');
  await page.locator('input[type=file]').last().setInputFiles('docs/assets/readme/home-recommendation.jpeg');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('navigation').getByRole('link', { name: '홈', exact: true }).click();
  await expect(page).toHaveURL(/\/record$/);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('navigation').getByRole('link', { name: '홈', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
});
