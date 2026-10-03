// One-time read-only public-source discovery. No tokens, login, media binaries or DB writes.
import {mkdirSync,writeFileSync} from 'node:fs';import {load} from 'cheerio';import {createHash} from 'node:crypto';
const urls=['https://t.me/s/radiolyzhi','https://t.me/s/ski_lizzer1n','https://t.me/s/skiclassics','https://t.me/s/russianbiathlon','https://t.me/s/flgrussia','https://vk.ru/shlaegreid','https://vk.ru/bestskiers','https://vk.ru/biathlon','https://vk.ru/norways_biathletes','https://vk.ru/lizzerinofficial','https://www.sports.ru/biathlon/','https://www.sports.ru/skiing/','https://www.championat.com/biathlon/','https://skisport.ru/','https://rsport.ria.ru/','https://www.sports.ru/rss/rubric.xml?s=biathlon','https://www.championat.com/xml/rss_all.xml'];
const reports=[];mkdirSync('artifacts/media-probe',{recursive:true});
for(const url of urls){try{
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'user-agent':'WinterSportsHub/1.6 public-media-discovery'}});
 if(!r.ok){reports.push({url,status:r.status,location:r.headers.get('location')});await r.body?.cancel();continue}
 if(!r.body)throw new Error('NO_BODY');let bytes=0;const chunks=[],reader=r.body.getReader();try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>3*1024*1024){await reader.cancel();throw new Error('BODY_LIMIT')}chunks.push(value)}}finally{reader.releaseLock()}
 const raw=Buffer.concat(chunks),body=raw.toString('utf8'),$=load(body);const xml=load(body,{xmlMode:true});
 const feeds=$('link[type*="rss"],link[type*="atom"],a[href*="rss"],a[href*=".xml"]').toArray().map(el=>({url:$(el).attr('href'),type:$(el).attr('type'),text:$(el).text().trim().slice(0,100)})).slice(0,20);
 const messages=$('.tgme_widget_message[data-post]');const telegram=messages.toArray().slice(0,2).map(el=>{const m=$(el);return {id:m.attr('data-post'),date:m.find('time').attr('datetime'),forward:m.find('.tgme_widget_message_forwarded_from').text(),forwardHtml:$.html(m.find('.tgme_widget_message_forwarded_from')).slice(0,1600),text:m.find('.tgme_widget_message_text').text().slice(0,220),author:m.find('.tgme_widget_message_author').text(),markup:$.html(m).slice(0,5000)}});
 const postLinks=$('a[href*="wall-"]').toArray().slice(0,6).map(el=>$(el).attr('href'));
 reports.push({url,status:r.status,type:r.headers.get('content-type'),bytes,sha256:createHash('sha256').update(raw).digest('hex'),title:$('title').text(),feeds,tgCount:messages.length,telegram,xmlItems:xml('item,entry').length,xmlRoot:body.slice(0,1400),vkWallLinks:postLinks});
 if(messages.length||xml('item,entry').length)writeFileSync('artifacts/media-probe/'+reports.length+'.source',body);
}catch(e){reports.push({url,error:e.message,cause:e.cause?.code??null})}}
writeFileSync('artifacts/media-probe/report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({url,status,error,tgCount,xmlItems,feeds})=>({url,status,error,tgCount,xmlItems,feeds})),null,2));
