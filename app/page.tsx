import Link from 'next/link';
import {SiteNav} from '../components/SiteNav';
import {RaceList} from '../components/RaceList';
import {getRaces} from '../lib/data';
import {moscowDate} from '../lib/domain.mjs';
import {pageMetadata} from '../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Биатлон и лыжные гонки 2026–2027: календарь и трансляции','Расписание гонок по московскому времени, официальные источники, статусы и ссылки правообладателей. Биатлон и лыжные гонки сезона 2026–2027.','/');
export default async function Home(){
 const result=await getRaces({from:moscowDate(),limit:12});
 return <main id="main-content"><SiteNav/><header className="seasonHero"><div className="eyebrow">WINTER SPORTS HUB · СЕЗОН 2026/27</div><h1>Весь сезон.<br/><span className="outlineText">Без догадок.</span></h1><p className="lead">Биатлон и лыжные гонки: расписание по Москве, статусы стартов и официальные источники. Неизвестное время остаётся неизвестным.</p><div className="heroLinks"><Link className="primaryLink" href="/calendar">Открыть календарь ↗</Link><Link href="/competitions">Все этапы сезона →</Link></div></header><section className="ticker" aria-label="Принципы данных"><span>IBU · FIS · СБР · ФЛГР</span><span>Первоисточники важнее перепечаток</span><Link href="/methodology">Как проверяем данные →</Link></section><div className="grid"><section><div className="sectionHead"><div><small>БЛИЖАЙШИЕ ОПУБЛИКОВАННЫЕ ГОНКИ</small><h2>Следующие старты</h2></div><Link href="/calendar">Весь календарь →</Link></div><RaceList {...result}/></section><aside><div className="panel hero"><small>ПРОВЕРКА, А НЕ ИМИТАЦИЯ LIVE</small><h2>Что известно?</h2><p>У каждой гонки — источник и статус. Программа этапа, время отдельного старта и начало трансляции проверяются отдельно.</p><Link href="/data-health">Состояние данных →</Link></div><div className="panel"><small>ДВА ВИДА СПОРТА</small><h2>Выберите свою зиму</h2><div className="stackLinks"><Link href="/biathlon">Биатлон →</Link><Link href="/cross-country">Лыжные гонки →</Link><Link href="/methodology">Источники и исправления →</Link></div></div></aside></div></main>;
}
