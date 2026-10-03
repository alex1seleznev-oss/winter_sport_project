import aliases from '../content/editorial/search-aliases.json' with {type:'json'};
import {editorialFilters,filterArticles} from './editorial-content.mjs';
export const MAX_QUERY_LENGTH=120;
export const searchSortLabels={relevance:'По совпадению',newest:'Сначала новые',shortest:'Сначала короткие'};
// Spelling aliases only: no model calls, similarity claims or inferred athlete facts.
export function normalizeSearch(value){return String(value??'').slice(0,100000).toLowerCase().replaceAll('æ','ae').replaceAll('œ','oe').replaceAll('ø','o').replaceAll('ł','l').replaceAll('ß','ss').normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
export function discoveryOptions(params={}){
 const filters=editorialFilters(params);let query='',queryError=null;
 if(params.q!==undefined){if(typeof params.q!=='string')queryError='Передайте один поисковый запрос.';else if(params.q.length>MAX_QUERY_LENGTH)queryError='Запрос слишком длинный: максимум 120 символов.';else query=params.q.replace(/[\p{Cc}\p{Cf}]/gu,' ').replace(/\s+/gu,' ').trim();}
 const terms=[...new Set(normalizeSearch(query).split(' ').filter(Boolean))];
 if(query&&!terms.length)queryError='Введите фамилию, тему или число, а не только знаки.';
 if(terms.length>12)queryError='В одном запросе допустимо не больше 12 слов.';
 const sort=typeof params.sort==='string'&&Object.hasOwn(searchSortLabels,params.sort)?params.sort:query?'relevance':'newest';
 return {...filters,query,terms,queryError,sort};
}
export function searchScore(article,terms){
 if(!terms.length)return 0;
 const title=normalizeSearch(article.title),dek=normalizeSearch(article.dek),names=normalizeSearch((article.athletes||[]).flatMap(key=>aliases[key]||[]).join(' '));
 const body=normalizeSearch(String(article.body||'').replace(/\[s:[a-z0-9-]+\]/g,' '));let score=0;
 for(const term of terms){const t=title.includes(term),d=dek.includes(term),n=names.includes(term),b=body.includes(term);if(!t&&!d&&!n&&!b)return null;score+=(t?18:0)+(n?10:0)+(d?5:0)+(b?1:0);}
 return score;
}
export function discoverArticles(articles,options){
 if(options.queryError)return [];
 const matched=filterArticles(articles,options).map(article=>({article,score:searchScore(article,options.terms)})).filter(row=>row.score!==null);
 const newest=(a,b)=>(Date.parse(b.article.publishedAt)||0)-(Date.parse(a.article.publishedAt)||0);
 matched.sort((a,b)=>{const order=options.sort==='shortest'?(a.article.readMinutes??999)-(b.article.readMinutes??999):options.sort==='relevance'?(b.score-a.score):0;return order||newest(a,b)||a.article.slug.localeCompare(b.article.slug,'en');});
 return matched.map(row=>row.article);
}
export function discoveryHref(options,patch={}){
 const values={sport:options.sport,type:options.type,athlete:options.athlete,q:options.query,sort:options.sort,...patch},params=new URLSearchParams();
 for(const key of ['sport','type','athlete','q','sort'])if(typeof values[key]==='string'&&values[key])params.set(key,values[key]);
 return '/media'+(params.size?'?'+params.toString():'');
}
