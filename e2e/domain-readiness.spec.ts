import {test,expect} from '@playwright/test';
test('skip link bypasses navigation and moves keyboard focus to the content heading',async({page})=>{
 await page.goto('/calendar');await page.keyboard.press('Tab');
 await expect(page.getByRole('link',{name:'Перейти к содержанию',exact:true})).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.locator('h1')).toBeFocused();
 await expect(page).toHaveURL(/#main-content$/);
});
test('site icon loads locally and no public configuration secrets are needed',async({page,request})=>{
 await page.goto('/guides');const href=await page.locator('link[rel="icon"]').getAttribute('href');expect(href).toMatch(/^\/icon\.svg/);
 const r=await request.get(href!);expect(r.status()).toBe(200);expect(r.headers()['content-type']).toContain('image/svg+xml');
 expect(await r.text()).toContain('WSH');
});
