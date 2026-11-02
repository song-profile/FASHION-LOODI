import { test, expect } from '@playwright/test';
import { signedIn } from './fixtures';

test('packaged Korean font renders without any external font service', async ({ page }) => {
  await signedIn(page);
  const font = page.waitForResponse(r => r.url().endsWith('/fonts/NotoSansKR.woff'));
  await page.goto('/home/');
  expect((await font).status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => Array.from(document.fonts).some(f => f.family.replaceAll('"', '') === 'Noto Sans KR' && f.status === 'loaded'))).toBe(true);
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible();
  for (const path of ['/home/', '/record/', '/timeline/', '/dna/', '/closet/']) {
    await page.goto(path);
    await page.getByRole('navigation', { name: '주요 메뉴' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('body')).not.toContainText('\uFFFD');
    for (const label of await page.locator('nav a, h1').all()) {
      expect(await label.evaluate(el => {
        const range = document.createRange(); range.selectNodeContents(el);
        const text = range.getBoundingClientRect(); const box = el.getBoundingClientRect();
        return text.left >= box.left - 1 && text.right <= box.right + 1 && text.bottom <= box.bottom + 1;
      }), `${path}: visible text fits its container`).toBe(true);
    }
  }
});
