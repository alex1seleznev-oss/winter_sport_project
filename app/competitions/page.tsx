import Link from 'next/link';
import {SiteNav} from '../../components/SiteNav';
import {CompetitionList} from '../../components/CompetitionList';
import {getCompetitions} from '../../lib/data';
import {normalizeFilters} from '../../lib/domain.mjs';
import {pageMetadata} from '../../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Этапы биатлона и лыжных гонок 2026–2027','Этапы сезона с программой отдельных гонок, датами, местом и источником. Проекты календаря отмечены отдельно.','/competitions');
export default async function Competitions({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const filters=normalizeFilters(await searchParams);const result=await getCompetitions(filters);return <main id="main-content"><SiteNav/><header className="calendarHeader"><div className="eyebrow">ЭТАПЫ · 2026/27</div><h1 className="detailTitle">География сезона</h1><p className="lead">Откройте этап, чтобы увидеть связанные гонки. Общий диапазон дат не заменяет время отдельного старта.</p><div className="heroLinks"><Link href="/competitions?sport=biathlon">Биатлон</Link><Link href="/competitions?sport=cross_country">Лыжные гонки</Link><Link href="/competitions?scope=russia">Россия</Link><Link href="/competitions">Все этапы</Link></div></header><CompetitionList {...result}/></main>}
