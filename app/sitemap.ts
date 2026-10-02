import type {MetadataRoute} from 'next';
import {getRaces} from '../lib/data';
import {canIndex,siteOrigin} from '../lib/seo';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!canIndex||!siteOrigin)return [];
 const {races,unavailable}=await getRaces();
 if(unavailable)throw new Error('SITEMAP_DATA_UNAVAILABLE');
 const pages=['/','/calendar','/competitions','/biathlon','/cross-country','/sources','/methodology'];
 return [...pages.map(path=>({url:siteOrigin+path})),...races.map(r=>({url:`${siteOrigin}/race-center/${r.id}`,lastModified:r.updated_at}))];
}
