import {test,expect} from '@playwright/test';
for(const route of ['/media/laegreid-2025-26','/guides/kak-chitat-kalendar'])test(`contents adapt and remain usable on ${route}`,async({page},info)=>{
 await page.goto(route);const contents=page.locator('details').filter({has:page.getByText('В этом материале',{exact:true})});
 if(info.project.name==='webkit-mobile'){
  await expect(contents).not.toHaveAttribute('open','');
  await contents.locator('summary').click();
 }else await expect(contents).toHaveAttribute('open','');
 await contents.getByRole('link',{name:'Источники',exact:true}).click();
 await expect(page).toHaveURL(/#(?:article-sources|references)$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
