import Link from 'next/link';
import {SiteNav} from '../../components/SiteNav';
import {RaceList} from '../../components/RaceList';
import {getRaces} from '../../lib/data';
import {pageMetadata} from '../../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Лыжные гонки 2026–2027: календарь, этапы и результаты','Расписание лыжных гонок сезона 2026–2027. Мужчины и женщины, международные и российские соревнования, источники FIS и ФЛГР.','/cross-country');
export default async function CrossCountry(){const result=await getRaces({sport:'cross_country'});return <main id="main-content"><SiteNav/><header><div className="eyebrow">ЛЫЖНЫЕ ГОНКИ · 2026/27</div><h1>Весь маршрут<br/>одного сезона.</h1><p className="lead">Опубликованные гонки FIS и российских организаторов: дата, формат, категория и источник. Время отдельных забегов и финалов добавляется только при наличии данных.</p><div className="heroLinks"><Link href="/calendar?sport=cross_country">Календарь лыжных гонок →</Link><Link href="/competitions">Этапы и туры →</Link></div></header><div className="calendarList"><RaceList {...result}/></div><section className="prose"><h2>Программа этапа и отдельная гонка</h2><p>Этап может включать несколько дней и форматов. Общий диапазон дат не является временем каждой гонки. Проект календаря ФЛГР отмечается отдельно от окончательной программы; оценка надёжности федерации не превращает проект в утверждённый документ.</p></section></main>}
