import Link from 'next/link';
import {SiteNav} from '../../components/SiteNav';
import {RaceList} from '../../components/RaceList';
import {getRaces} from '../../lib/data';
import {pageMetadata} from '../../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Биатлон 2026–2027: расписание, этапы и трансляции','Опубликованные гонки по биатлону, международные и российские серии. Дата этапа, программа гонки и время эфира проверяются отдельно.','/biathlon');
export default async function Biathlon(){const result=await getRaces({sport:'biathlon'});return <main id="main-content"><SiteNav/><header><div className="eyebrow">БИАТЛОН · 2026/27</div><h1>Точность.<br/>На каждом рубеже.</h1><p className="lead">Здесь собраны опубликованные гонки по биатлону. Источник расписания — IBU или организатор российских соревнований. Старт-лист, результат и ссылка на эфир не заменяют друг друга.</p><div className="heroLinks"><Link href="/calendar?sport=biathlon">Календарь биатлона →</Link><Link href="/competitions">Все этапы сезона →</Link></div></header><div className="calendarList"><RaceList {...result}/></div><section className="prose"><h2>Как читать расписание</h2><p>«Предварительно» означает, что программа может измениться. «Время не опубликовано» означает отсутствие точного времени в базе, а не отмену гонки. В карточке гонки можно открыть первоисточник и увидеть доступные проверенные трансляции.</p></section></main>}
