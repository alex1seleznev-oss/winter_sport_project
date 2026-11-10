import {test,expect} from '@playwright/test';

test('viewer landing explains why it exists and offers real actions',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Биатлон и лыжные гонки');
 await expect(page.getByRole('link',{name:/Найти ближайшую гонку/})).toHaveAttribute('href','/calendar');
 await expect(page.getByRole('link',{name:/Календарь в телефон/})).toHaveAttribute('href','/calendar/subscribe');
 await expect(page.getByRole('region',{name:'Что вы получаете на сайте'}).getByRole('article')).toHaveCount(3);
 await expect(page.getByRole('link',{name:/Настроить календарь/})).toHaveAttribute('href','/calendar/subscribe');
 await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',/winter-landscape-1280\.webp/);
 await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content','summary_large_image');
 await expect(page.locator('h1')).toHaveCount(1);
});
test('mobile navigation and race actions are not clipped or hidden',async({page})=>{
 for(const width of [320,360,390,430,700,1024]){
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  const links=page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link');
  await expect(links).toHaveCount(4);
  for(const link of await links.all()){await expect(link).toBeVisible();const bounds=await link.boundingBox();expect(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1).toBeTruthy();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const actions=page.locator('.race .actions a');
  for(const link of await actions.all())await expect(link).toBeVisible();
 }
});
test('article stage action follows verified catalogue instead of hard-coded id',async({page})=>{
 await page.goto('/media/kontiolahti-2026-preview');
 const link=page.getByRole('link',{name:/Программа этапа|Найти этап в календаре/});
 await expect(link).toBeVisible();
 await expect(link).toHaveAttribute('href',/^\/competitions(?:\/\d+)?$/);
 await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content','article');
});
