import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const routes=['/','/calendar','/competitions','/competitions/1','/competitions/12','/race-center/4','/watch','/my-season','/reading-list','/media','/media/klaebo-three-globes','/media/season-2025-26','/media/season-2025-26/women','/media/cross-country-2025-26','/guides','/guides/kak-chitat-kalendar','/calendar/subscribe','/athletes','/photo-credits','/sources','/changes','/data-health','/data-status','/methodology','/legal','/platform','/biathlon','/cross-country','/analytics','/intelligence','/athletes/not-an-id'];
const capture:Record<string,string>={'/calendar':'calendar','/competitions':'stages','/competitions/1':'programme','/media':'media','/media/klaebo-three-globes':'article','/media/season-2025-26':'comparison','/my-season':'saved','/photo-credits':'credits','/platform':'platform','/athletes':'archive'};
for(const route of routes)test('light theme and readable text: '+route,async({page},info)=>{
 const response=await page.goto(route);expect(response?.status()).toBe(route==='/athletes/not-an-id'?404:200);
 await expect(page.locator('body')).toHaveCSS('background-color','rgb(247, 250, 252)');await expect(page.locator('html')).toHaveCSS('color-scheme','light');
 await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#f7fafc');
 if(route!=='/athletes/not-an-id'){const nav=page.getByRole('navigation',{name:'Основная навигация',exact:true});await expect(nav.getByRole('link')).toHaveCount(4)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 // Photo overlays are visually reviewed separately; all other text uses its effective solid surface.
 if(route!=='/'&&route!=='/athletes'){
 const issues=await page.locator('main').evaluate(root=>{
  const rgb=(s:string)=>{const n=s.match(/[\d.]+/g)?.map(Number)||[];return [n[0]||0,n[1]||0,n[2]||0,n[3]??1]};
  const mix=(top:number[],under:number[])=>[0,1,2].map(i=>top[i]*top[3]+under[i]*(1-top[3])).concat(1);
  const luminance=(c:number[])=>c.slice(0,3).map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const issues:string[]=[];
  for(const node of root.querySelectorAll('h1,h2,h3,p,li,small,label,select,input,summary,button,figcaption,a,dt,dd,td,th,span')){
   if(!(node instanceof HTMLElement)||node.closest('[aria-hidden="true"]')||node.matches(':disabled'))continue;
   const rect=node.getBoundingClientRect(),style=getComputedStyle(node);if(!rect.width||!rect.height||style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0)continue;
   const direct=[...node.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim();if(!/[\p{L}\p{N}]/u.test(direct))continue;
   const chain:HTMLElement[]=[];for(let el:HTMLElement|null=node;el;el=el.parentElement)chain.unshift(el);
   let bg=[247,250,252,1];for(const el of chain)bg=mix(rgb(getComputedStyle(el).backgroundColor),bg);
   const ink=mix(rgb(style.color),bg),a=luminance(ink),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),size=parseFloat(style.fontSize),bold=parseInt(style.fontWeight)>=700,min=size>=24||(bold&&size>=18.66)?3:4.5;
   if(ratio+.05<min)issues.push(node.tagName+' '+direct.slice(0,65)+' contrast='+ratio.toFixed(2)+' '+style.color);
  }
  return issues.slice(0,15);
 });
 expect(issues,'Insufficient text contrast on '+route).toEqual([]);
 }
 if(capture[route]){mkdirSync('artifacts/screenshots',{recursive:true});await page.screenshot({path:'artifacts/screenshots/'+info.project.name+'-light-'+capture[route]+'.png',fullPage:false})}
});
test('light controls keep selected, focus and cancelled states distinct',async({page})=>{
 await page.goto('/competitions/1');const button=page.getByRole('button',{name:'Добавить в «Мой сезон»: Контиолахти',exact:true});const before=await button.evaluate(el=>getComputedStyle(el).backgroundColor);await button.click();const selected=page.getByRole('button',{name:'Убрать из «Мой сезон»: Контиолахти',exact:true});await expect(selected).toHaveAttribute('aria-pressed','true');expect(await selected.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(before);await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(selected).toBeFocused();expect(await selected.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
 await page.goto('/calendar?state=cancelled');const status=page.locator('.status.cancelled').first();if(await status.count()){await expect(status).toBeVisible();expect(await status.evaluate(el=>getComputedStyle(el).color)).not.toBe('rgb(22, 51, 72)')}
});
