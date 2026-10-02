import type {Metadata} from 'next';
import Link from 'next/link';
import './globals.css';
import './foundation.css';
import './reliability.css';
import {canIndex,siteOrigin} from '../lib/seo';
export const metadata:Metadata={metadataBase:siteOrigin?new URL(siteOrigin):undefined,title:{default:'Winter Sports Hub — биатлон и лыжные гонки 2026–2027',template:'%s | Winter Sports Hub'},description:'Биатлон и лыжные гонки: опубликованный календарь, первоисточники, статусы и трансляции.',robots:{index:canIndex,follow:canIndex},referrer:'strict-origin-when-cross-origin'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body><a className="skipLink" href="#site-content">Перейти к содержанию</a><div id="site-content" tabIndex={-1}>{children}</div><footer className="siteFooter"><div><b>WINTER SPORTS HUB</b><p>Независимый информационный проект. Не является сайтом IBU, FIS, СБР или ФЛГР.</p></div><nav aria-label="Информация о проекте"><Link href="/methodology">Методология</Link><Link href="/legal">Права и условия</Link><Link href="/data-health">Состояние данных</Link><Link href="/platform">Архитектура</Link></nav></footer></body></html>}
