import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test('guide hub and article render sources, navigation and no horizontal overflow',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/guides');await expect(page.locator('.guideCard')).toHaveCount(6);
 mkdirSync('artifacts/screenshots',{recursive:true});
 await page.screenshot({path:`artifacts/screenshots/${info.project.name}-guide-hub.png`,fullPage:false});
 await page.locator('.guideCard h2 a').first().click();await expect(page.locator('h1')).toContainText('Как читать календарь');
 await page.screenshot({path:`artifacts/screenshots/${info.project.name}-guide.png`,fullPage:false});
 await page.getByRole('navigation',{name:'Содержание материала'}).getByRole('link',{name:'Источники',exact:true}).click();
 await expect(page).toHaveURL(/#references$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(errors).toEqual([]);
});
test('gender, status and Russian search work together without changing source records',async({page})=>{
 await page.goto('/calendar');await page.locator('select[name="gender"]').selectOption('women');await page.locator('select[name="state"]').selectOption('not_cancelled');
 await page.getByRole('searchbox').fill('рука спринт');await page.getByRole('button',{name:'Показать',exact:true}).click();
 await expect(page.locator('.race')).toHaveCount(1);await expect(page.locator('.race')).toContainText('Женщины');await expect(page.locator('.race')).toContainText('Спринт');
 await page.getByText('Название в источнике',{exact:true}).click();await expect(page.getByText('Sprint C',{exact:true})).toBeVisible();
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
});
test('ICS endpoint returns stable UTF8 calendar and rejects unpublished or malformed requests',async({request},info)=>{
 const first=await request.get('/api/calendar.ics?event=4');expect(first.status()).toBe(200);expect(first.headers()['content-type']).toContain('text/calendar');
 const body=await first.text();expect(body).toContain('BEGIN:VCALENDAR');expect(body).toContain('DTSTART;VALUE=DATE:20261127');expect(body).not.toContain('BEGIN:VALARM');
 for(const line of body.split('\r\n'))expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
 const cached=await request.get('/api/calendar.ics?event=4',{headers:{'If-None-Match':first.headers()['etag']}});expect(cached.status()).toBe(304);
 expect((await request.get('/api/calendar.ics?event=1')).status()).toBe(404);expect((await request.get('/api/calendar.ics?url=https://example.test')).status()).toBe(400);
 mkdirSync('artifacts/calendars',{recursive:true});writeFileSync(`artifacts/calendars/${info.project.name}-single-race.ics`,body);
 const season=await request.get('/api/calendar.ics?scope=russia');expect(season.status()).toBe(200);const seasonBody=await season.text();
 expect(seasonBody.startsWith('BEGIN:VCALENDAR')).toBe(true);expect(seasonBody).not.toContain('ATTENDEE:');
 writeFileSync(`artifacts/calendars/${info.project.name}-russia-season.ics`,seasonBody);
});
test('subscription controls create a real download and explain date-only markers',async({page},info)=>{
 await page.goto('/calendar/subscribe');await page.getByLabel('Вид спорта',{exact:true}).selectOption('cross_country');await page.getByLabel('Серия',{exact:true}).selectOption('russia');
 await expect(page.getByRole('link',{name:'Скачать ICS',exact:true})).toHaveAttribute('href','/api/calendar.ics?sport=cross_country&scope=russia');
 await expect(page.getByText(/записи экспортируются как отметка даты/)).toBeVisible();
 await page.getByRole('button',{name:'Скопировать ссылку подписки'}).click();
 await expect(page.getByLabel('Ссылка подписки',{exact:true})).toHaveValue(/\/api\/calendar\.ics\?sport=cross_country&scope=russia$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`artifacts/screenshots/${info.project.name}-subscribe.png`,fullPage:false});
});
test('legacy listing redirects instead of exposing a second stale event catalogue',async({request})=>{
 const response=await request.get('/race-center',{maxRedirects:0});expect(response.status()).toBe(308);expect(response.headers()['location']).toBe('/calendar');
});
test('guide links and single-race export entry are reachable',async({page})=>{
 await page.goto('/race-center/4');await expect(page.getByRole('link',{name:'Скачать событие ICS'})).toHaveAttribute('href','/api/calendar.ics?event=4');await expect(page.getByRole('heading',{name:'Понять формат'})).toBeVisible();
 const r=await page.goto('/guides/not-a-published-guide');expect(r?.status()).toBe(404);
});
