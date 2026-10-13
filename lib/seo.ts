import type {Metadata} from 'next';
import {siteConfiguration} from './site-config.mjs';
const configuration=siteConfiguration(process.env);
export const siteOrigin=configuration.origin;
export const canIndex=configuration.canIndex;
export const siteVerification=configuration.verification;
export function pageMetadata(title:string,description:string,path:string,index=true):Metadata {
  return {title,description,alternates:siteOrigin?{canonical:siteOrigin+path}:undefined,robots:{index:canIndex&&index,follow:canIndex&&index},openGraph:{title,description,type:'website',locale:'ru_RU',siteName:'Winter Sports Hub',...(siteOrigin?{url:siteOrigin+path}: {})}};
}
