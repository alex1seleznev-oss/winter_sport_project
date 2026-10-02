import {notFound} from 'next/navigation';
import Link from 'next/link';
import {SiteNav} from '../../../components/SiteNav';
import {RaceStageLink} from '../../../components/RaceStageLink';
import {RaceViewerTools} from '../../../components/RaceViewerTools';
import {getRace} from '../../../lib/data';
import {supabase} from '../../../lib/supabase';
import {disciplineLabel,raceLabel} from '../../../lib/viewer.mjs';
import {formatDate,genderLabel,jsonForHtml,raceStart,raceStatus,safeHttpsUrl,sportLabel} from '../../../lib/domain.mjs';
import {pageMetadata,siteOrigin} from '../../../lib/seo';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props){
 const r=await getRace((await params).id);
 return r?pageMetadata(`${raceLabel(r)} — ${r.location||r.series}, ${r.event_date||'дата уточняется'}`,`${sportLabel(r.sport)}. ${genderLabel(r.gender)}. ${raceStatus(r.status)}. Программа и первоисточник.`,`/race-center/${r.id}`):{title:'Гонка не найдена',robots:{index:false,follow:false}};
}
export default async function RacePage({params}:Props){
 const r=await getRace((await params).id);if(!r)notFound();
 const [{data:streams,error:streamError},{data:results,error:resultError}]=await Promise.all([
  supabase.from('streams').select('id,label,url,region').eq('event_id',r.id).in('rights_status',['official','authorized']).not('verified_at','is',null),
  supabase.from('athlete_results').select('id,rank,source_url,athletes(full_name)').eq('event_id',r.id).not('source_url','is',null).order('rank',{nullsFirst:false}).limit(100)
 ]);
 const source=safeHttpsUrl(r.source_url),start=raceStart(r.event_date,r.start_time_msk),title=disciplineLabel(r.discipline);
 const schema=siteOrigin&&start&&r.location&&!['tentative','provisional'].includes(r.status)?{
  '@context':'https://schema.org','@type':'SportsEvent',name:`${sportLabel(r.sport)}: ${raceLabel(r)} — ${genderLabel(r.gender)}`,
  startDate:start,url:`${siteOrigin}/race-center/${r.id}`,location:{'@type':'Place',name:r.location},
  ...(r.status==='cancelled'?{eventStatus:'https://schema.org/EventCancelled'}:{})
 }:null;
 return <main id="main-content"><SiteNav/>
  {schema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonForHtml(schema)}}/>}
  <header className="calendarHeader"><div className="eyebrow">{sportLabel(r.sport)} · {genderLabel(r.gender)}</div>
   <h1 className="detailTitle">{title}</h1><p className="lead">{r.series} · {r.location||'Место уточняется'}{r.distance?' · '+r.distance:''}</p>
   {title!==r.discipline&&<details className="sourceOriginal"><summary>Название в первоисточнике</summary><p lang="en">{r.discipline}</p></details>}
   <div className="detailFacts"><span>{formatDate(r.event_date)}</span><span>{r.start_time_msk?`${r.start_time_msk.slice(0,5)} МСК`:'Время не опубликовано'}</span><span className={'status '+r.status}>{raceStatus(r.status)}</span></div>
  </header>
  {r.notes&&<div className="notice">{r.notes}</div>}
  <div className="grid"><section><RaceStageLink competitionId={r.competition_id}/>
   <article className="panel"><h2>Трансляция</h2>{streamError?<p>Список трансляций временно недоступен.</p>:streams?.length?streams.map(s=>safeHttpsUrl(s.url)&&<p key={s.id}><a href={safeHttpsUrl(s.url)!} rel="noopener noreferrer" target="_blank">{s.label} ↗</a> · {s.region||'Регион уточняется'}</p>):<p>В базе пока нет проверенной ссылки правообладателя. Это не означает, что трансляции не будет.</p>}<Link href="/guides/translyaciya-i-vremya-starta">Как проверить эфир →</Link></article>
   <article className="panel"><h2>Результаты</h2>{resultError?<p>Результаты временно недоступны.</p>:results?.length?<div className="tableScroll"><table><caption>Опубликованные записи; полный протокол и его статус — у организатора.</caption><thead><tr><th>Место</th><th>Спортсмен</th><th>Источник</th></tr></thead><tbody>{results.map(row=><tr key={row.id}><td>{row.rank??'—'}</td><td>{(Array.isArray(row.athletes)?row.athletes[0]:row.athletes)?.full_name||'Имя уточняется'}</td><td>{safeHttpsUrl(row.source_url)&&<a href={safeHttpsUrl(row.source_url)!} target="_blank" rel="noopener noreferrer">Протокол ↗</a>}</td></tr>)}</tbody></table></div>:<p>В базе пока нет протокола этой гонки. Старт-лист, предварительный и окончательный результат — разные документы.</p>}</article>
  </section><aside><article className="panel"><small>ПРОИСХОЖДЕНИЕ ДАННЫХ</small><h2>Проверяемо</h2>
   {source&&<a className="watchButton" href={source} target="_blank" rel="noopener noreferrer">Открыть первоисточник ↗</a>}
   <p>Последняя проверка в базе: {r.verified_at?new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'medium',timeStyle:'short'}).format(new Date(r.verified_at))+' МСК':'не указана'}.</p>
   <p>Авторитет источника {r.source_confidence??'—'}/5 не гарантирует неизменность расписания.</p><Link href="/methodology">Методология →</Link>
  </article><RaceViewerTools id={r.id} sport={r.sport} discipline={r.discipline} eventDate={r.event_date}/></aside></div>
 </main>;
}
