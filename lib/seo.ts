import type {Metadata} from 'next';
import {siteConfiguration} from './site-config.mjs';
import cover from '../content/visual/viewer-cover.json';
const configuration=siteConfiguration(process.env);
export const siteOrigin=configuration.origin;
export const canIndex=configuration.canIndex;
export const siteVerification=configuration.verification;
export function pageMetadata(title:string,description:string,path:string,index=true):Metadata {
  const image=cover.variants.find(v=>v.width===1280)??cover.variants[cover.variants.length-1];
  return {title,description,alternates:siteOrigin?{canonical:siteOrigin+path}:undefined,robots:{index:canIndex&&index,follow:canIndex&&index},openGraph:{title,description,type:'website',locale:'ru_RU',siteName:'Winter Sports Hub',...(siteOrigin?{url:siteOrigin+path}: {}),images:[{url:siteOrigin?siteOrigin+image.src:image.src,width:image.width,height:image.height,alt:cover.title}]},twitter:{card:'summary_large_image',title,description,images:[siteOrigin?siteOrigin+image.src:image.src]}};
}
