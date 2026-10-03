import {cache} from 'react';import {supabase} from './supabase';import firstIssue from '../content/editorial/manifest.json';import secondIssue from '../content/editorial/season-two-manifest.json';import firstSources from '../content/editorial/sources.json';import secondSources from '../content/editorial/season-two-sources.json';import data from '../content/editorial/season-data.json';import {inspectArticle} from './editorial-content.mjs';
const manifest=[...firstIssue,...secondIssue];
export type ArticleMeta=typeof manifest[number];
export type EditorialArticle=ArticleMeta&{id:number;body:string;author:string;publishedAt:string;updatedAt:string};
export const editorialSources=[...firstSources,...secondSources,{id:data.sourceId,publisher:data.publisher,title:data.title,url:data.url,date:data.asOf.slice(0,10),reviewedOn:'2026-10-03',type:'official_results',facts:[data.note]}];
export const articleTypeLabel:Record<string,string>={analysis:'Аналитика',recap:'После гонки',preview:'Превью'};
export const athleteLabel:Record<string,string>={perrot:'Эрик Перро',laegreid:'Стурла Легрейд',giacomel:'Томмазо Джакомель',botn:'Йохан-Олав Ботн'};
export const getEditorial=cache(async()=>{
 const {data:rows,count,error}=await supabase.from('articles').select('id,slug,title,dek,body_md,article_type,author,published_at,updated_at,status',{count:'exact'}).eq('status','published').not('published_at','is',null).lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).order('id',{ascending:false}).range(0,99);
 if(error||!rows||count===null||count>100||rows.length!==count)return {articles:[] as EditorialArticle[],unavailable:true};const articles:EditorialArticle[]=[];
 for(const row of rows){const meta=manifest.find(m=>m.slug===row.slug);if(!meta)continue;if(!inspectArticle(row,meta))return {articles:[] as EditorialArticle[],unavailable:true};articles.push({...meta,id:row.id,body:row.body_md,author:row.author||'Редакция Winter Sports Hub',publishedAt:row.published_at,updatedAt:row.updated_at});}return {articles,unavailable:false};
});
export async function getEditorialArticle(slug:string){if(!/^[a-z0-9-]{3,90}$/.test(slug)||!manifest.some(m=>m.slug===slug))return null;const result=await getEditorial();if(result.unavailable)throw new Error('EDITORIAL_CONTENT_UNAVAILABLE');return result.articles.find(a=>a.slug===slug)||null}
