import type {MetadataRoute} from 'next';
import {getRaces,getCompetitions} from '../lib/data';
import {canIndex,siteOrigin} from '../lib/seo';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(!canIndex||!siteOrigin)return [];const [r,c]=await Promise.all([getRaces(),getCompetitions()]);if(r.unavailable||c.unavailable)throw new Error('SITEMAP_DATA_UNAVAILABLE');return [...['/','/calendar','/competitions','/biathlon','/cross-country','/sources','/methodology'].map(path=>({url:siteOrigin+path})),...r.races.map(e=>({url:`${siteOrigin}/race-center/${e.id}`,lastModified:e.updated_at})),...c.competitions.map(e=>({url:`${siteOrigin}/competitions/${e.id}`,lastModified:e.updated_at}))]}
