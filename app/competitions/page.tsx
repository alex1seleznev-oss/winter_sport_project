import Link from 'next/link';
import {Target,Mountain,Globe2,MapPin} from 'lucide-react';
import {SiteNav} from '../../components/SiteNav';
import {StageCard} from '../../components/stages/StageCard';
import {StageFilters} from '../../components/stages/StageFilters';
import {getStageCatalogue} from '../../lib/stage-data';
import {normalizeStageFilters,filterStageModels} from '../../lib/stage-catalog.mjs';
import {pageMetadata} from '../../lib/seo';
import styles from '../../components/stages/Stages.module.css';
export const dynamic='force-dynamic';
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({searchParams}:Props){
 const values=normalizeStageFilters(await searchParams);
 return pageMetadata('Этапы биатлона и лыжных гонок 2026–2027: программы и даты','Все опубликованные этапы Winter Sports Hub: Россия и международные серии, программы по дням, статусы и источники.','/competitions',!Object.values(values).some(Boolean));
}
export default async function Competitions({searchParams}:Props){
 const values=normalizeStageFilters(await searchParams),data=await getStageCatalogue();
 const selected=filterStageModels(data.models,values);
 const count=selected.reduce((n,s)=>n+(s.summary?.total||0),0);
 const available=selected.filter(s=>s.summary&&s.summary.total>0).length;
 const tabs=[
  {href:'/competitions?sport=biathlon&scope=international',sport:'biathlon',scope:'international',title:'Биатлон · мир',Icon:Target},
  {href:'/competitions?sport=biathlon&scope=russia',sport:'biathlon',scope:'russia',title:'Биатлон · Россия',Icon:MapPin},
  {href:'/competitions?sport=cross_country&scope=international',sport:'cross_country',scope:'international',title:'Лыжи · мир',Icon:Mountain},
  {href:'/competitions?sport=cross_country&scope=russia',sport:'cross_country',scope:'russia',title:'Лыжи · Россия',Icon:MapPin}
 ];
 return <main id="main-content" className={styles.shell}>
  <SiteNav/>
  <header className={styles.hero}>
   <div><div className={styles.seasonLabel}>WINTER SPORTS HUB · 2026/27</div><h1>Этапы и старты.<br/><span>Ближе к зиме.</span></h1></div>
   <p>Биатлон и лыжные гонки. Места, даты и проверенные программы — в одном календаре. Откройте этап, чтобы увидеть каждый опубликованный старт.</p>
  </header>
  <nav className={styles.tabs} aria-label="Направления соревнований">
   <Link href="/competitions" aria-current={!values.sport&&!values.scope?'page':undefined}><Globe2 size={16} aria-hidden="true"/>Все этапы</Link>
   {tabs.map(t=><Link key={t.href} href={t.href} aria-current={values.sport===t.sport&&values.scope===t.scope?'page':undefined}><t.Icon size={15} aria-hidden="true"/>{t.title}</Link>)}
  </nav>
  <StageFilters values={values} programmeUnavailable={data.programmeUnavailable}/>
  {data.unavailable ? (
   <div className="emptyState" role="status"><h2>Этапы временно недоступны</h2><p>Не удалось получить полный список. Попробуйте обновить страницу или откройте первоисточники.</p><Link href="/sources">Источники →</Link></div>
  ) : (
   <>
    {data.programmeUnavailable&&<div className={styles.problem} role="status">Этапы доступны, но программу гонок получить не удалось. Счётчики стартов не подменяются нулями.</div>}
    <div className={styles.summary}><p><b>{selected.length}</b> этапов в выборке{!data.programmeUnavailable&&<> · <b>{available}</b> с гонками · <b>{count}</b> записей гонок</>}</p><Link href="/calendar">Полный календарь гонок →</Link></div>
    {!selected.length ? (
     <div className="emptyState"><h2>Нет этапов по этим фильтрам</h2><p>Это результат поиска в опубликованной базе, а не сообщение об отмене соревнований.</p><Link href="/competitions">Показать все этапы →</Link></div>
    ) : (
     <div className={styles.cards}>{selected.map(model=><StageCard model={model} key={model.competition.id}/>)}</div>
    )}
   </>
  )}
  <p className={styles.countNote}>Карточки используют опубликованные данные базы. Диапазон дат этапа может включать организационные дни; число записей учитывает квалификации, финалы и отменённые гонки. «В календаре» не означает окончательную неизменность программы. Графические обложки не являются фотографиями или схемами трасс.</p>
 </main>;
}
