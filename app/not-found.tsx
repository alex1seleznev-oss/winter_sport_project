import Link from 'next/link';
export default function NotFound(){return <main id="main-content"><div className="emptyState"><h1 className="detailTitle">Страница не найдена</h1><p>Гонка может ещё не быть опубликована. Проверьте общий календарь.</p><Link href="/calendar">Календарь →</Link></div></main>}
