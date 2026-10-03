import {test,expect} from '@playwright/test';
test('FIS sprint qualifications and finals remain separate in stage, calendar and race journey',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/competitions/14');
 await expect(page.locator('.race')).toHaveCount(10);
 for(const day of ['2026-12-12','2026-12-13']){
  const section=page.locator('#day-'+day);
  await expect(section.locator('.race')).toHaveCount(4);
  const titles=await section.locator('.race h3').allTextContents();
  expect(titles.slice(0,2).every(title=>title.includes('квалификация'))).toBe(true);
  expect(titles.slice(2).every(title=>!title.includes('квалификация'))).toBe(true);
  await expect(section.locator('.race .date span').filter({hasText:'Время не опубликовано'})).toHaveCount(4);
 }
 await expect(page.locator('.race[data-race-id="18"] h3 a')).toHaveAttribute('href','/race-center/18');
 await expect(page.locator('.race[data-race-id="19"] h3 a')).toHaveAttribute('href','/race-center/19');
 await expect(page.locator('#day-2026-12-12 .race').first().getByRole('link',{name:'Первоисточник ↗'})).toHaveAttribute('href','https://www.fis-ski.com/DB/general/event-details.html?eventid=63004&seasoncode=2027&sectorcode=CC');
 await page.locator('#day-2026-12-13 .race h3 a').first().click();
 await expect(page.getByRole('heading',{level:1})).toContainText('Командный спринт — квалификация');
 await page.goto('/calendar?sport=cross_country&scope=international&q=Рука');
 await expect(page.locator('.race')).toHaveCount(8);
 const races=await page.locator('.race h3').allTextContents();
 expect(races.slice(2,4).every(title=>title.includes('квалификация'))).toBe(true);
 expect(races.slice(4,6).every(title=>title.includes('финал'))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errors).toEqual([]);
});
test('Davos ICS exposes all ten source-backed sessions with unique IDs and no fabricated clocks',async({request})=>{
 const response=await request.get('/api/calendar.ics?competition=14');expect(response.status()).toBe(200);
 const body=(await response.text()).replace(/\r\n /g,'');
 expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(10);
 expect(new Set(body.match(/UID:[^\r\n]+/g)).size).toBe(10);
 expect(body.match(/DTSTART;VALUE=DATE:/g)).toHaveLength(10);
 expect(body.match(/квалификация/g)).toHaveLength(4);
 expect(body.includes('DTSTART:')).toBe(false);
});
