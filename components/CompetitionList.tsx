import Link from 'next/link';
import type {Competition} from '../lib/data';
import {formatDate,raceStatus,safeHttpsUrl,sportLabel} from '../lib/domain.mjs';
export function CompetitionList({competitions,unavailable=false}:{competitions:Competition[];unavailable?:boolean}){
 if(unavailable)return <div className="emptyState" role="status">Не удалось загрузить этапы. Это ошибка запроса, а не отсутствие соревнований.</div>;
 if(!competitions.length)return <div className="emptyState">В базе пока нет опубликованных этапов для выбранного периода.</div>;
 return <div className="competitionGrid">{competitions.map(c=><article className={'competition '+(c.sport==='cross_country'?'skiCard':'')} key={c.id}><div className="tags"><i>{sportLabel(c.sport)}</i><i>{c.scope==='russia'?'Россия':'Международные'}</i></div><h2><Link href={`/competitions/${c.id}`}>{c.location||'Место уточняется'}</Link></h2><p>{c.name} · {c.series}</p><div className="competitionDate">{formatDate(c.start_date)} — {formatDate(c.end_date)}</div><span className={'status '+c.status}>{raceStatus(c.status)}</span><div className="stageActions"><Link href={`/competitions/${c.id}`}>Программа этапа →</Link>{safeHttpsUrl(c.source_url)&&<a href={safeHttpsUrl(c.source_url)!} target="_blank" rel="noopener noreferrer">Первоисточник ↗</a>}</div></article>)}</div>;
}
