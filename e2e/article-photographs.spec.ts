import {test,expect} from '@playwright/test';

test('article photographs have visible archive captions and retain reading order',async({page},info)=>{
  await page.goto('/media/perrot-2025-26');
  const cover=page.locator('[data-photo-position="cover"]');
  await expect(cover).toContainText('Эрик Перро');
  await expect(cover).toContainText('Архивный кадр');
  await expect(cover.locator('a[href*="creativecommons.org"]')).toHaveCount(1);
  const inline=page.locator('[data-photo-position="inline"]');
  await expect(inline).toHaveCount(1);
  await inline.scrollIntoViewIfNeeded();
  await expect(inline.locator('img')).toBeVisible();
  await expect.poll(()=>inline.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',/perrot/);
  await page.screenshot({path:`artifacts/screenshots/${info.project.name}-article-inline-photo.png`});
});

test('preview archive pictures do not imply athlete entry and original faces are local assets',async({page})=>{
  await page.goto('/media/kontiolahti-2026-preview');
  await expect(page.locator('header')).toContainText('Состав участников не подтверждён');
  await expect(page.locator('[data-photo-position="cover"]')).toHaveCount(0);
  await expect(page.locator('[data-article-photo="laegreid"]')).toContainText('Нове-Место · 2024');
  for(const img of await page.locator('[data-article-photo] img').all())await expect(img).toHaveAttribute('src',/^\/(athletes|editorial)\//);
});
