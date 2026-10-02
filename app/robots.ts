import type {MetadataRoute} from 'next';
import {canIndex,siteOrigin} from '../lib/seo';
export default function robots():MetadataRoute.Robots{return canIndex&&siteOrigin?{rules:{userAgent:'*',allow:'/',disallow:['/api/','/admin/','/platform','/data-health','/data-status','/intelligence']},sitemap:`${siteOrigin}/sitemap.xml`}:{rules:{userAgent:'*',disallow:'/'}}}
