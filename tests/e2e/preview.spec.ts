import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { signedIn } from './fixtures';

test('capture the implemented design with isolated sample records', async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signedIn(page);
  await page.goto('/home');
  await page.getByRole('navigation', { name: '주요 메뉴' }).waitFor();
  const photo = (await sharp('public/hero-model.jpg').resize({ width: 480 }).jpeg({ quality: 78 }).toBuffer()).toString('base64');
  await page.evaluate(photo => {
    const entries = ['느긋한 니트의 하루', '나를 닮은 클래식', '가벼운 주말 산책'].map((title, index) => {
      const date = new Date(); date.setDate(date.getDate() - index * 2);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { id: `design-preview-${index}`, date: dateKey, createdAt: date.toISOString(), title,
        photos: [{ mediaType: 'image/jpeg', base64: photo }], tags: index === 1 ? ['Classic', 'Minimal'] : ['Casual', 'Minimal'],
        colors: ['아이보리', '네이비', '브라운'], items: [{ category: '상의', name: '아이보리 니트' }, { category: '아우터', name: '네이비 재킷' }],
        weather: '☀️ 21°C', mood: '😊', memo: '좋아하는 옷과 함께 보낸 하루.' };
    });
    localStorage.setItem('loodi_outfit_diary:11111111-1111-4111-8111-111111111111', JSON.stringify(entries));
  }, photo);
  const dir = 'artifacts/design-preview'; mkdirSync(dir, { recursive: true });
  const screens = [['home', '01', '매일의 스타일 저널'], ['timeline', '02', '사진으로 쌓이는 룩북'], ['record', '03', '가볍게 시작하는 기록'], ['dna', '04', '데이터로 발견한 취향'], ['closet', '05', '나를 닮은 옷장']];
  for (const [route] of screens) {
    await page.goto(`/${route}`);
    await page.getByRole('navigation', { name: '주요 메뉴' }).waitFor();
    if (route === 'timeline') await page.getByRole('button', { name: '모아보기', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${dir}/${route}.png`, fullPage: false });
  }
  const frame = (source: (name: string) => string) => `<!doctype html><html lang="ko"><meta charset="utf-8"><title>LOODI · Design Preview</title><style>*{box-sizing:border-box}body{margin:0;padding:50px;background:#ecebe5;color:#292722;font-family:Arial,sans-serif}header{display:flex;justify-content:space-between;align-items:end;margin-bottom:32px}h1{font-size:46px;letter-spacing:-3px;margin:0}h1 span{color:#803e50}.eyebrow{font-size:10px;letter-spacing:3px;color:#68685e;margin-bottom:12px}.note{font-size:13px;line-height:1.8;text-align:right;color:#65645e}.screens{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:22px}figure{margin:0}figcaption{font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:9px}figcaption b{font:italic 22px Georgia;color:#833e50}img{display:block;width:100%;border-radius:25px;box-shadow:0 12px 30px #29272212;border:6px solid #fff}footer{margin-top:25px;display:flex;justify-content:space-between;font-size:11px;color:#747269;letter-spacing:.5px}@media(max-width:900px){.screens{grid-template-columns:repeat(2,minmax(0,1fr))}body{padding:24px}header{display:block}.note{text-align:left}}</style><header><div><p class="eyebrow">PERSONAL STYLE JOURNAL / UI EXPLORATION</p><h1>loodi<span>.</span> <i style="font-family:Georgia;font-weight:400">The everyday edit.</i></h1></div><p class="note">크림 · 버건디 · 올리브, 그리고 매일의 사진<br>샘플 기록으로 확인한 실제 구현 화면 · 피그마 원본 미연결</p></header><div class="screens">${screens.map(([route, number, title]) => `<figure><figcaption><b>${number}</b>${title}</figcaption><img src="${source(route)}" alt="${title}"></figure>`).join('')}</div><footer><span>WEAR. RECORD. REPEAT.</span><span>Next.js / 모바일 화면 390 × 844</span></footer></html>`;
  writeFileSync(`${dir}/index.html`, frame(route => `${route}.png`));
  const board = await browser.newPage({ viewport: { width: 1650, height: 930 }, deviceScaleFactor: 1 });
  await board.setContent(frame(route => `data:image/png;base64,${readFileSync(`${dir}/${route}.png`).toString('base64')}`));
  await board.screenshot({ path: `${dir}/overview.png`, fullPage: true });
  await board.close();
});
