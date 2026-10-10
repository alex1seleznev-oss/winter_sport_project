import {cache} from 'react';import {supabase} from './supabase';import firstIssue from '../content/editorial/manifest.json';import secondIssue from '../content/editorial/season-two-manifest.json';import thirdIssue from '../content/editorial/issue-three-manifest.json';import xcIssue from '../content/editorial/xc-manifest.json';import readerIssue from '../content/editorial/reader-release-manifest.json';import readerSources from '../content/editorial/reader-release-sources.json';import firstSources from '../content/editorial/sources.json';import secondSources from '../content/editorial/season-two-sources.json';import thirdSources from '../content/editorial/issue-three-sources.json';import xcSources from '../content/editorial/xc-sources.json';import data from '../content/editorial/season-data.json';import {resolveReviewedRows} from './editorial-review.mjs';
const manifest=[...[...firstIssue,...secondIssue,...thirdIssue,...readerIssue].map(a=>({...a,sport:'biathlon'})),...xcIssue];
export type ArticleMeta=typeof manifest[number];export type EditorialArticle=ArticleMeta&{id:number;body:string;author:string;publishedAt:string;updatedAt:string};
export const editorialSources=[...firstSources,...secondSources,...thirdSources,...xcSources,...readerSources,{id:data.sourceId,publisher:data.publisher,title:data.title,url:data.url,date:data.asOf.slice(0,10),reviewedOn:'2026-10-03',type:'official_results',facts:[data.note]}];
export const articleTypeLabel:Record<string,string>={analysis:'Аналитика',recap:'После гонки',preview:'Превью'};
export const athleteLabel:Record<string,string>={perrot:'Эрик Перро',laegreid:'Стурла Легрейд',giacomel:'Томмазо Джакомель',botn:'Йохан-Олав Ботн',samuelsson:'Себастьян Самуэльссон',jacquelin:'Эмильен Жаклен',jeanmonnot:'Лу Жанмонно','hanna-oeberg':'Ханна Эберг',vittozzi:'Лиза Виттоцци','elvira-oeberg':'Эльвира Эберг',minkkinen:'Суви Минккинен',simon:'Жюлия Симон',klaebo:'Йоханнес Клебо',amundsen:'Харальд Эстберг Амундсен',diggins:'Джесси Диггинс',ilar:'Моа Илар',dahlqvist:'Майя Дальквист'};
export const getEditorial=cache(async()=>{
 const {data:rows,count,error}=await supabase.from('articles').select('id,slug,title,dek,body_md,article_type,author,published_at,updated_at,status',{count:'exact'}).eq('status','published').not('published_at','is',null).lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).order('id',{ascending:false}).range(0,99);
 if(error||!rows||count===null||count>100||rows.length!==count)return {articles:[] as EditorialArticle[],unavailable:true,partial:false,withheldSlugs:[] as string[]};
 const resolved=resolveReviewedRows(rows,manifest);return {...resolved,unavailable:false};
});
export async function getEditorialArticle(slug:string){
 if(!/^[a-z0-9-]{3,90}$/.test(slug)||!manifest.some(m=>m.slug===slug))return null;
 const result=await getEditorial();if(result.unavailable||result.withheldSlugs.includes(slug))throw new Error('EDITORIAL_CONTENT_UNAVAILABLE');
 return result.articles.find(a=>a.slug===slug)||null;
}
