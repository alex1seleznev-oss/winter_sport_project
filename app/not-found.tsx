import {SiteNav} from '../components/SiteNav';
import Link from 'next/link';
export default function NotFound(){return <main id="main-content"><SiteNav/><div className="emptyState"><h1 className="detailTitle">Страница не найдена</h1><p>Проверьте адрес или вернитесь к календарю и материалам.</p><Link href="/calendar">Календарь →</Link><p><Link href="/media">Материалы →</Link></p></div></main>}
