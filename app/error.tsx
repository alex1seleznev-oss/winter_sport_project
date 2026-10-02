'use client';
export default function ErrorPage({reset}:{error:Error & {digest?:string};reset:()=>void}){return <main id="main-content"><div className="emptyState"><h1 className="detailTitle">Данные временно недоступны</h1><p>Не удалось загрузить страницу. Непроверенное расписание вместо неё не показываем.</p><button onClick={reset}>Повторить</button> <a href="/">На главную</a></div></main>}
