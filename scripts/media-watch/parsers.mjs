import {load} from 'cheerio';
import {text,reference,timestamp} from './model.mjs';
const document=(raw,xmlMode=false)=>{if(typeof raw!=='string'||Buffer.byteLength(raw)>3*1024*1024)throw new Error('DOCUMENT_SIZE');const $=load(raw,{xmlMode});if(!xmlMode)$('script,style,noscript,template,nav,footer').remove();return $;};
const plain=raw=>{const $=document(raw||'');$('br').replaceWith(' ');$('p,div,li').before(' ').after(' ');return text($.root().text());};
export function telegram(raw,source){
 if(!/^[a-z0-9_]{3,64}$/.test(source.handle))throw new Error('CHANNEL_HANDLE');
 const $=document(raw),posts=$('.tgme_widget_message[data-post]');if(!posts.length)throw new Error('PUBLIC_PREVIEW_NOT_AVAILABLE');const rows=new Map();
 for(const node of posts.toArray()){
  const el=$(node),id=el.attr('data-post');if(!new RegExp('^'+source.handle+'/[1-9][0-9]*$').test(id||''))throw new Error('CHANNEL_IDENTITY');
  const body=el.find('.tgme_widget_message_text').first(),forward=el.find('.tgme_widget_message_forwarded_from_name').first(),at=el.find('a.tgme_widget_message_date time').first().attr('datetime');
  if(!timestamp(at))throw new Error('POST_TIMESTAMP');
  const item={externalId:id,url:'https://t.me/'+id,publishedAt:at,text:plain(body.html()),forwardedFrom:reference(forward.attr('href')),links:body.find('a[href]').toArray().map(a=>reference($(a).attr('href'))).filter(Boolean)};
  const old=rows.get(id);if(old?.text&&item.text&&old.text!==item.text)throw new Error('DUPLICATE_ID_CONFLICT');if(!old||item.text.length>old.text.length)rows.set(id,item);
 }
 return {rows:[...rows.values()].slice(0,30),scanned:posts.length,coverage:'Latest public preview; no complete history guarantee'};
}
export function rss(raw,source){
 if(/<!ENTITY\b|<!DOCTYPE\b/i.test(raw))throw new Error('XML_ENTITY_REJECTED');
 const $=document(raw,true);if(!$.root().children('rss,feed').length)throw new Error('NOT_RSS_OR_ATOM');const entries=$('channel>item,feed>entry');if(!entries.length)throw new Error('EMPTY_FEED');const rows=[];
 for(const node of entries.toArray().slice(0,100)){
  const e=$(node),atom=e[0].name==='entry';const link=atom?e.children('link').filter((_,a)=>!$(a).attr('rel')||$(a).attr('rel')==='alternate').first():e.children('link').first();
  const url=reference(link.attr('href')||link.text());if(!url||!['www.sports.ru','sports.ru'].includes(new URL(url).hostname))continue;
  const published=e.children('pubDate,published').first().text().trim();
  if(published&&!timestamp(published))throw new Error('FEED_TIMESTAMP');
  rows.push({externalId:e.children('guid,id').first().text()||url,url,publishedAt:published||null,text:plain(e.children('title').text()),links:[]});
 }
 if(!rows.length)throw new Error('NO_FEED_REFERENCES');return {rows,scanned:entries.length,coverage:'RSS/Atom headlines only; feed window is not complete archive'};
}
export function mediaIndex(raw,source){
 const $=document(raw),title=$('title').text();
 if(/Вход через SberID/i.test($.root().text()))throw new Error('LOGIN_INTERSTITIAL');
 if(source.adapter==='sports_index'&&!/Sports\.ru/i.test(title)||source.adapter==='skisport_index'&&!/Лыжный\s+Спорт/i.test(title))throw new Error('PUBLISHER_IDENTITY');
 const found=new Map();
 for(const node of $('a[href]').toArray()){
  const a=$(node),url=reference(a.attr('href'),source.fetchUrl);if(!url)continue;const u=new URL(url);
  const valid=source.adapter==='sports_index'?['www.sports.ru','sports.ru'].includes(u.hostname)&&/^\/(biathlon|skiing)\/[0-9]+[\w-]*\.html$/.test(u.pathname):['skisport.ru','www.skisport.ru'].includes(u.hostname)&&/^\/news\/(cross-country|biathlon|rollerski|ski-roller)\/[0-9]+\/?$/.test(u.pathname);
  if(!valid)continue;const caption=text(a.text());if(caption.length<18)continue;u.search='';const key=u.href;
  const card=a.closest('article,li,[class*="news-item"],[class*="news__item"],[class*="news_item"]');const rawDate=card.find('time[datetime]').first().attr('datetime');
  const at=timestamp(rawDate);if(rawDate&&!at)throw new Error('INDEX_TIMESTAMP');
  if(!found.has(key)||caption.length>found.get(key).text.length)found.set(key,{externalId:u.pathname,url:key,text:caption,publishedAt:at,links:[]});
 }
 if(!found.size)throw new Error('NO_MEDIA_STORY_LINKS');return {rows:[...found.values()].slice(0,30),scanned:found.size,coverage:'Headlines on section index; date unknown unless explicitly given'};
}
