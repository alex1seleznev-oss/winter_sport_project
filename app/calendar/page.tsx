import {SiteNav} from '../../components/SiteNav';
import {RaceFilters,RaceList} from '../../components/RaceList';
import {getRaces} from '../../lib/data';
import {normalizeFilters} from '../../lib/domain.mjs';
import {pageMetadata} from '../../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Календарь биатлона и лыжных гонок 2026–2027','Опубликованные гонки сезона 2026–2027: даты, московское время, Россия и международные серии. Предварительные и отменённые старты отмечены отдельно.','/calendar');
export default async function Calendar({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const filters=normalizeFilters(await searchParams); const result=await getRaces(filters);
 return <main id="main-content"><SiteNav/><header><div className="eyebrow">КАЛЕНДАРЬ · 2026/27</div><h1>Каждый старт.<br/>С источником.</h1><p className="lead">Фильтруйте гонки по виду спорта и серии. Время указано по Москве; отсутствие времени не означает старт в полночь.</p></header><RaceFilters {...filters}/><div className="calendarList"><RaceList {...result}/></div></main>;
}
