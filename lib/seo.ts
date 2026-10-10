import type {Metadata} from 'next';
import {safeHttpsUrl} from './domain.mjs';
const configured = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
const validated = safeHttpsUrl(configured);
export const siteOrigin = validated ? new URL(validated).origin : null;
export const canIndex = !!siteOrigin && process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV === 'production';
export function pageMetadata(title:string,description:string,path:string,index=true):Metadata {
  return {title,description,twitter:{card:'summary_large_image',title,description,images:['/opengraph-image']},alternates:siteOrigin?{canonical:siteOrigin+path}:undefined,robots:{index:canIndex&&index,follow:canIndex},openGraph:{title,description,type:'website',locale:'ru_RU',siteName:'Winter Sports Hub',images:[{url:'/opengraph-image',width:1200,height:630,alt:'Winter Sports Hub — биатлон и лыжные гонки'}],...(siteOrigin?{url:siteOrigin+path}: {})}};
}
