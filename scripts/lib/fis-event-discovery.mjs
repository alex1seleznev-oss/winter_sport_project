export function discoverRaceLinks(html,base='https://www.fis-ski.com'){
 const seen=new Map();
 const re=/href="([^"]*results\.html\?[^"]*raceid=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;let m;
 while((m=re.exec(html))){const href=m[1].replace(/&amp;/g,'&');const label=m[3].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();if(label)seen.set(m[2],{race_id:m[2],url:href.startsWith('http')?href:base+href,label})}
 return [...seen.values()];
}
