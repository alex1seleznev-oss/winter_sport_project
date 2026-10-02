const channels=[
 {name:'Радиолыжи',url:'https://t.me/s/radiolyzhi',reliability:3},
 {name:'Lizzerin',url:'https://t.me/s/ski_lizzer1n',reliability:3},
 {name:'СБР',url:'https://t.me/s/russianbiathlon',reliability:5},
 {name:'ФЛГР',url:'https://t.me/s/flgrussia',reliability:5},
 {name:'Лыжная классика',url:'https://t.me/s/skiclassics',reliability:3}
];
function decode(s){return s.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
function posts(html,base){const out=[];const re=/<div class="tgme_widget_message_wrap[\s\S]*?data-post="([^"]+)"[\s\S]*?<time[^>]*datetime="([^"]+)"[\s\S]*?<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/g;let m;while((m=re.exec(html))&&out.length<30){const text=decode(m[3]);if(text.length>30)out.push({id:m[1],published_at:m[2],text,url:'https://t.me/'+m[1]})}return out}
for(const c of channels){try{const r=await fetch(c.url,{headers:{'user-agent':'WinterSportsHub/1.0'}});const html=await r.text();const p=posts(html,c.url);console.log(JSON.stringify({channel:c.name,posts:p.length,sample:p.slice(0,2)}));}catch(e){console.error(c.name,String(e))}}
