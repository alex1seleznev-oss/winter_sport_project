import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
test('operations page distinguishes telemetry from worker configuration',async({page},info)=>{
 await page.goto('/platform');await expect(page.getByRole('heading',{level:1})).toContainText('до публикации.');
 await expect(page.getByRole('region',{name:'Состояние очередей'})).toBeVisible();
 await expect(page.getByText('Настройки кода, а не подтверждение последнего успешного запуска.')).toBeVisible();
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(await page.content()).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
 mkdirSync('artifacts/screenshots',{recursive:true});
 await page.screenshot({path:`artifacts/screenshots/${info.project.name}-operations.png`,fullPage:true});
});
test('invalid athlete routes are real 404 responses',async({request})=>{
 for(const id of ['not-an-id','0','99999999999999999999999']){
  const response=await request.get('/athletes/'+id);expect(response.status()).toBe(404);
  expect(await response.text()).toMatch(/noindex/);
 }
});
test('season links work directly from the photographic cover',async({page})=>{
 await page.goto('/');const quick=page.getByRole('navigation',{name:'Быстрый доступ к сезону'});
 await expect(quick.getByRole('link',{name:'Открыть календарь сезона'})).toBeVisible();
 await quick.getByRole('link',{name:'Открыть календарь сезона'}).click();await expect(page).toHaveURL(/\/calendar$/);
});
