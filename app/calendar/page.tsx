import {SiteNav} from '../../components/SiteNav';
import {RaceFilters,RaceList} from '../../components/RaceList';
import {getRaces} from '../../lib/data';
import {normalizeFilters} from '../../lib/domain.mjs';
import {calendarWindow} from '../../lib/calendar-window.mjs';
import {pageMetadata} from '../../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Календарь биатлона и лыжных гонок 2026–2027','Опубликованные гонки сезона: даты, московское время, Россия и международные серии.','/calendar');
export default async function Calendar({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const filters=normalizeFilters(params);const when=typeof params.when==='string'&&['today','tomorrow','week'].includes(params.when)?params.when:'season';const range=calendarWindow(when);const result=await getRaces({...filters,from:range.from,to:range.to});return <main id="main-content"><SiteNav/><header className="calendarHeader"><div className="eyebrow">КАЛЕНДАРЬ · 2026/27</div><h1 className="detailTitle">Календарь гонок</h1><p className="lead">{range.label}. Время по Москве. Отсутствие времени не означает старт в полночь.</p></header><RaceFilters {...filters} when={when}/><div className="calendarList"><RaceList {...result}/></div></main>}
