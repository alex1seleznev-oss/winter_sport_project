import Link from 'next/link';
import {ArrowUpRight,Bookmark,CalendarDays,ArrowRight,ShieldCheck,Clock3,Smartphone} from 'lucide-react';
import {SiteNav} from '../components/SiteNav';
import {RaceList} from '../components/RaceList';
import {SaveButton} from '../components/personal/SaveButton';
import {GuideCards} from '../components/GuideCards';
import {FeaturedProgramme} from '../components/home/FeaturedProgramme';
import {LatestEditorial} from '../components/editorial/LatestEditorial';
import {ViewerHero} from '../components/home/ViewerHero';
import {websiteSchema,serializeSchema} from '../lib/site-schema.mjs';
import {getStageCatalogue} from '../lib/stage-data';
import {homeSeason} from '../lib/home-season.mjs';
import {stagePlace,stageDateRange,stageSeries,stageCountry} from '../lib/stage-catalog.mjs';
import {moscowDate} from '../lib/domain.mjs';
import {guides} from '../lib/guides';
import {pageMetadata,siteOrigin} from '../lib/seo';
import styles from '../components/home/ViewerHome.module.css';
export const dynamic='force-dynamic';
export const viewport={themeColor:'#f7fafc'};
export const metadata=pageMetadata('Биатлон и лыжные гонки 2026–2027: календарь и трансляции','Календарь зимних гонок, время стартов по Москве, информация о трансляциях и материалы о сезоне. Сохраните важные этапы в «Мой сезон».','/');
export default async function Home(){
 const data=await getStageCatalogue(),snapshot=homeSeason(data.models,moscowDate()),featured=snapshot.stage,c=featured?.competition;
 return <main id="main-content" className={styles.home} data-viewer-home>
  {siteOrigin&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeSchema(websiteSchema(siteOrigin))}}/>}
  <div className={styles.navFrame}><SiteNav/></div><div className={styles.heroFrame}><ViewerHero/></div>
  <div className={styles.content} id="season-content">
   {c?<section className={styles.nextStage} aria-labelledby="next-stage-title"><div className={styles.stageLead}><span className={styles.eyebrow}>БЛИЖАЙШИЙ ЭТАП</span><h2 id="next-stage-title"><Link href={`/competitions/${c.id}`}>{stagePlace(c)}</Link></h2><p>{stageSeries(c.series)} · {stageCountry(c)}</p></div><div className={styles.stageProgramme}><div className={styles.date}><CalendarDays size={18} aria-hidden="true"/>{stageDateRange(c.start_date,c.end_date)}</div><FeaturedProgramme summary={featured.summary}/></div><div className={styles.stageActions}><Link href={`/competitions/${c.id}`}>Программа этапа <ArrowUpRight size={17} aria-hidden="true"/></Link><SaveButton kind="stage" id={c.id} label={stagePlace(c)}/></div></section>:<section className={styles.nextStage}><div><h2>{data.unavailable?'Календарь временно недоступен':'Сезон в архиве'}</h2><p>{data.unavailable?'Попробуйте открыть расписание чуть позже.':'Программы прошедших этапов остаются доступны в календаре.'}</p></div><Link href="/calendar">Открыть календарь →</Link></section>}
   <div className={styles.schedule}><section aria-labelledby="races-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>ПЛАН НА ГОНКИ</p><h2 id="races-title">{snapshot.showsLater?'Следующие старты':'Ближайшая неделя'}</h2></div><Link href="/calendar">Все гонки <ArrowUpRight size={16} aria-hidden="true"/></Link></div><nav className={styles.periods} aria-label="Быстрый выбор периода"><Link href="/calendar?when=today">Сегодня</Link><Link href="/calendar?when=tomorrow">Завтра</Link><Link href="/calendar?when=week">7 дней</Link></nav>{snapshot.showsLater&&<p className={styles.note}>На ближайшие семь дней гонок пока нет. Ниже — следующие опубликованные старты.</p>}<RaceList races={snapshot.races} unavailable={data.unavailable||data.programmeUnavailable}/></section>
   <aside className={styles.sidebar}><article className={styles.saved}><Bookmark size={25} strokeWidth={1.5} aria-hidden="true"/><p className={styles.eyebrow}>МОЙ СЕЗОН</p><h2>Только те гонки,<br/>которые ждёте вы.</h2><p>Сохраните этапы и старты, за которыми хотите следить. Ваша подборка всегда под рукой.</p><Link href="/my-season">Открыть «Мой сезон» <ArrowUpRight size={17} aria-hidden="true"/></Link><small>Без регистрации. Избранное хранится на этом устройстве.</small></article><Link className={styles.watchLink} href="/watch"><span>Где смотреть гонки<small>Каналы, ссылки и доступность трансляций</small></span><ArrowRight size={19} aria-hidden="true"/></Link></aside></div>
   <section className={styles.trustStrip} aria-label="Что вы получаете на сайте">
    <article><ShieldCheck size={22} strokeWidth={1.7} aria-hidden="true"/><div><h2>Проверяем источники</h2><p>Даты и результаты связаны с федерациями и организаторами. Спорные сведения не выдаём за подтверждённые.</p><Link href="/sources">Наши источники →</Link></div></article>
    <article><Clock3 size={22} strokeWidth={1.7} aria-hidden="true"/><div><h2>Следим за временем</h2><p>Подтверждённые старты показываем по Москве. Если точный час ещё неизвестен — честно указываем это.</p><Link href="/calendar">Проверить программу →</Link></div></article>
    <article><Smartphone size={22} strokeWidth={1.7} aria-hidden="true"/><div><h2>Собираем ваш сезон</h2><p>Сохраняйте интересные гонки и переносите расписание в календарь телефона без регистрации.</p><Link href="/calendar/subscribe">Добавить календарь →</Link></div></article>
   </section>
   <LatestEditorial light/>
   <section className={styles.guides} aria-labelledby="guides-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>ГИД ЗРИТЕЛЯ</p><h2 id="guides-title">Больше понимать. Ярче болеть.</h2></div><Link href="/guides">Все гиды <ArrowUpRight size={16} aria-hidden="true"/></Link></div><GuideCards items={guides.filter(g=>['kak-chitat-kalendar','start-list-i-rezultaty'].includes(g.slug))}/></section>
   <section className={styles.subscriptionCta} aria-labelledby="subscription-title">
    <div><p className={styles.eyebrow}>НЕ ПРОПУСКАЙТЕ СТАРТЫ</p><h2 id="subscription-title">Сезон уже в вашем календаре.</h2><p>Выберите биатлон или лыжные гонки, Россию или международные этапы. Получите ссылку на календарь или скачайте расписание одним файлом.</p></div>
    <Link href="/calendar/subscribe">Настроить календарь <ArrowUpRight size={18} aria-hidden="true"/></Link>
   </section>
  </div>
 </main>;
}
