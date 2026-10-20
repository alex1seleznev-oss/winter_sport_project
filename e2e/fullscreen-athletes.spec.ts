import {test,expect} from '@playwright/test';import {mkdirSync} from 'node:fs';
test('viewer homepage uses one local wide photograph, product copy and no horizontal overflow',async({page},info)=>{
 const errors:string[]=[],remote:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/wikimedia\.org|gsap\.com|cdnjs/.test(r.url()))remote.push(r.url())});
 await page.goto('/');const hero=page.locator('[data-viewer-hero]'),image=hero.locator('img');
 await expect(image).toHaveCount(1);await expect(image).toHaveAttribute('src',/\/home\/winter-landscape-1920.webp$/);await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(hero.getByRole('heading',{level:1})).toContainText('Ваш календарь');await expect(hero.getByRole('link',{name:'Открыть календарь сезона'})).toBeVisible();
 await expect(page.locator('[data-fullscreen-hero]')).toHaveCount(0);await expect(page.getByRole('button',{name:/Показать:/})).toHaveCount(0);
 expect(await image.evaluate((i:HTMLImageElement)=>i.naturalWidth/i.naturalHeight)).toBeCloseTo(16/9,2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const bg=await page.locator('[data-viewer-home]').evaluate(el=>getComputedStyle(el).backgroundColor);expect(bg).toBe('rgb(247, 250, 252)');
 mkdirSync('artifacts/screenshots',{recursive:true});await page.screenshot({path:`artifacts/screenshots/${info.project.name}-viewer-home.png`,fullPage:false});await page.screenshot({path:`artifacts/screenshots/${info.project.name}-viewer-full.png`,fullPage:true});expect(errors).toEqual([]);expect(remote).toEqual([]);
});
test('four viewer links stay in one horizontal row, including at 320px',async({page})=>{
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});await page.goto('/');const nav=page.getByRole('navigation',{name:'Основная навигация',exact:true}),links=nav.getByRole('link');await expect(links).toHaveCount(4);const labels=await links.allTextContents();expect(labels).toEqual(['Календарь','Где смотреть','Материалы','Мой сезон']);const boxes=await links.evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {y:r.y,height:r.height,right:r.right}}));expect(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))).toBeLessThan(2);for(const box of boxes){expect(box.height).toBeGreaterThanOrEqual(44);expect(box.right).toBeLessThanOrEqual(width)}expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
 await expect(page.getByRole('navigation',{name:'Мобильная навигация',exact:true})).toHaveCount(0);
});
test('reduced motion keeps homepage controls available and keyboard navigation works',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');const link=page.getByRole('navigation',{name:'Быстрый доступ к сезону'}).getByRole('link',{name:'Открыть календарь сезона'});await link.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/calendar$/);await expect(page.getByRole('heading',{level:1})).toContainText('Календарь гонок');
});
test('gallery and attribution remain meaningful with JavaScript disabled',async({browser,baseURL})=>{const ctx=await browser.newContext({baseURL,javaScriptEnabled:false}),page=await ctx.newPage();await page.goto('/athletes');await expect(page.locator('[data-athlete-scene]')).toHaveCount(5);await expect(page.getByRole('heading',{level:1})).toContainText('эпохи');await page.locator('#korostelev').scrollIntoViewIfNeeded();await expect.poll(()=>page.locator('#korostelev img').evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);await page.goto('/photo-credits');await expect(page.getByRole('heading',{name:'Савелий Коростелёв',exact:true})).toBeVisible();await expect(page.locator('#korostelev')).toContainText('Sandro Halank');await expect(page.locator('#bjoerndalen')).toContainText('CC BY-SA 3.0');await expect(page.locator('#latypov')).toContainText('285×390');await ctx.close()});

test('failed decorative cover leaves product text and calendar navigation usable',async({page})=>{
 await page.route('**/home/winter-landscape-*.webp',r=>r.abort());await page.goto('/');await expect(page.locator('h1')).toContainText('Ваш календарь');await page.getByRole('link',{name:'Открыть календарь сезона',exact:true}).click();await expect(page).toHaveURL(/\/calendar$/);
});
test('landscape assets have bounded size and visible attribution; upload boundaries remain intact',async({request,page})=>{
 for(const width of [720,1280,1920]){const image=await request.get('/home/winter-landscape-'+width+'.webp');expect(image.status()).toBe(200);expect(image.headers()['content-type']).toContain('image/webp');expect((await image.body()).length).toBeLessThan(250000)}
 expect((await request.post('/api/media/upload-ticket')).status()).toBe(503);await page.goto('/photo-credits');const credit=page.locator('#winter-landscape');await expect(credit).toContainText('Florian Pépellin');await expect(credit).toContainText('CC BY-SA 4.0');await expect(credit).toContainText('27 декабря 2025');await expect(credit.locator('a').first()).toHaveAttribute('href',/^https:\/\/commons\.wikimedia\.org/);
 await page.goto('/');await page.locator('#season-content').scrollIntoViewIfNeeded();await expect(page.locator('#season-content')).toContainText('БЛИЖАЙШИЙ ЭТАП');await expect(page.locator('[data-article-slug]')).toHaveCount(3);
});
test('homepage photo and product navigation remain available without JavaScript',async({browser,baseURL})=>{
 const ctx=await browser.newContext({baseURL,javaScriptEnabled:false}),page=await ctx.newPage();await page.goto('/');await expect(page.locator('h1')).toContainText('Ваш календарь');const image=page.locator('[data-viewer-cover]');await expect.poll(()=>image.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);await page.getByRole('link',{name:'Открыть календарь сезона'}).click();await expect(page).toHaveURL(/\/calendar$/);await ctx.close();
});
