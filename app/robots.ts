import type {MetadataRoute} from 'next';
import {canIndex,siteOrigin} from '../lib/seo';
// Allow crawling public noindex pages so search engines can see their directive.
export default function robots():MetadataRoute.Robots{return canIndex&&siteOrigin?{rules:{userAgent:'*',allow:'/',disallow:['/api/','/admin/']},sitemap:`${siteOrigin}/sitemap.xml`}:{rules:{userAgent:'*',disallow:'/'}}}
