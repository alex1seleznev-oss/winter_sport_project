import {inspectArticle} from './editorial-content.mjs';
// Withhold an invalid reviewed item without suppressing unrelated, independently valid articles.
export function resolveReviewedRows(rows,manifest,now=Date.now()){
 if(!Array.isArray(rows)||!Array.isArray(manifest)||rows.length>100||manifest.length>100)throw new Error('EDITORIAL_BOUND');
 const registry=new Map(manifest.map(m=>[m.slug,m]));if(registry.size!==manifest.length)throw new Error('EDITORIAL_MANIFEST_DUPLICATE');
 const counts=new Map();for(const row of rows)if(row&&typeof row.slug==='string')counts.set(row.slug,(counts.get(row.slug)||0)+1);
 const articles=[],withheld=new Set();
 for(const row of rows){
  if(!row||!registry.has(row.slug))continue;
  const meta=registry.get(row.slug),published=Date.parse(row.published_at),updated=Date.parse(row.updated_at);
  if(counts.get(row.slug)!==1||!inspectArticle(row,meta,now)||!Number.isSafeInteger(row.id)||row.id<1||row.author!=='Редакция Winter Sports Hub'||!Number.isFinite(updated)||updated<published||updated>now+300000){withheld.add(row.slug);continue;}
  articles.push({...meta,id:row.id,body:row.body_md,author:row.author,publishedAt:row.published_at,updatedAt:row.updated_at});
 }
 return {articles,withheldSlugs:[...withheld],partial:withheld.size>0};
}
