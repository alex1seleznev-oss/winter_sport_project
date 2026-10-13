// Read-only post-deploy check. No credentials, private APIs or automatic mutations.
import {load} from 'cheerio';
import {productionOrigin} from '../lib/site-config.mjs';
export function inspectPage(html,url){
 const $=load(html),errors=[];
 if(!$('title').text().trim())errors.push('TITLE_MISSING');
 if($('h1').length!==1)errors.push('H1_COUNT');
 const canonical=$('link[rel="canonical"]').attr('href');
 if(!canonical||new URL(canonical).href!==new URL(url).href)errors.push('CANONICAL_MISMATCH');
 const robots=$('meta[name="robots"]').attr('content')||'';
 if(/noindex/i.test(robots))errors.push('SITEMAP_PAGE_NOINDEX');
 for(const img of $('img').toArray())if(!$(img).attr('alt')?.trim())errors.push('IMAGE_ALT_MISSING');
 for(const s of $('script[type="application/ld+json"]').toArray())try{JSON.parse($(s).text())}catch{errors.push('INVALID_JSON_LD')}
 return {title:$('title').text(),canonical,errors:[...new Set(errors)]};
}
async function get(url){
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000),headers:{'user-agent':'WinterSportsHub/launch-verification'}});
 const text=await r.text();return {r,text};
}
export async function verifyPublicSite(origin){
 const checks=[],failures=[];
 const {r:robots,text:rules}=await get(origin+'/robots.txt');
 checks.push({path:'/robots.txt',status:robots.status});
 if(robots.status!==200||!rules.includes('Allow: /')||rules.includes('Disallow: /\n')||!rules.includes(`Sitemap: ${origin}/sitemap.xml`))failures.push({path:'/robots.txt',error:'ROBOTS_NOT_READY'});
 const {r:sitemap,text:xml}=await get(origin+'/sitemap.xml');
 const $=load(xml,{xmlMode:true}),urls=$('url>loc').toArray().map(e=>$(e).text());
 checks.push({path:'/sitemap.xml',status:sitemap.status,urls:urls.length});
 if(sitemap.status!==200||!urls.length||new Set(urls).size!==urls.length)throw new Error('SITEMAP_NOT_READY');
 if(urls.some(u=>new URL(u).origin!==origin||/^\/(api|admin)\//.test(new URL(u).pathname)))throw new Error('SITEMAP_ORIGIN_OR_PRIVATE_ROUTE');
 let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(cursor<urls.length){const url=urls[cursor++],path=new URL(url).pathname;
   try{const {r,text}=await get(url),result=inspectPage(text,url);checks.push({path,status:r.status,...result});if(r.status!==200||result.errors.length)failures.push({path,status:r.status,errors:result.errors});}
   catch{failures.push({path,error:'REQUEST_OR_DOCUMENT_FAILED'});}
  }
 }));
 const {r:notFound,text:missing}=await get(origin+'/__launch_missing_page__');
 if(notFound.status!==404||!load(missing)('meta[name="robots"]').toArray().some(e=>/noindex/i.test(load(missing)(e).attr('content')||'')))failures.push({path:'/__launch_missing_page__',error:'NOT_FOUND_NOT_SAFE'});
 return {origin,pages:urls.length,checked:checks.length,passed:failures.length===0,failures};
}
if(process.argv[1]?.endsWith('/verify-public-site.mjs')){
 const origin=productionOrigin(process.argv[2]);if(!origin)throw new Error('VERIFIED_HTTPS_ORIGIN_REQUIRED');
 const result=await verifyPublicSite(origin);console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
}
