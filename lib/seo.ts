import type {Metadata} from 'next';
import {safeHttpsUrl} from './domain.mjs';
const configured = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
const validated = safeHttpsUrl(configured);
export const siteOrigin = validated ? new URL(validated).origin : null;
export const canIndex = !!siteOrigin && process.env.VERCEL_ENV !== 'preview' && process.env.NODE_ENV === 'production';
export function pageMetadata(title:string,description:string,path:string,index=true):Metadata {
  return {title,description,alternates:siteOrigin?{canonical:siteOrigin+path}:undefined,robots:{index:canIndex&&index,follow:canIndex&&index},openGraph:{title,description,type:'website',locale:'ru_RU',siteName:'Winter Sports Hub',...(siteOrigin?{url:siteOrigin+path}: {})}};
}
