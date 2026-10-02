import {supabase} from '../../lib/supabase';
import {SiteNav} from '../../components/SiteNav';
import {pageMetadata} from '../../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('Состояние данных','Фактическое наполнение публичной части базы. Отсутствие данных отличается от ошибки запроса.','/data-health',false);
export default async function Health(){
 const tables=[['competitions','Этапы'],['events','Гонки с источником'],['source_feeds','Источники'],['athletes','Спортсмены'],['athlete_results','Записи результатов'],['articles','Опубликованные статьи'],['streams','Проверенные эфиры']] as const;
 const counts=await Promise.all(tables.map(async([table,label])=>{const {count,error}=await supabase.from(table).select('id',{count:'exact',head:true});return {label,value:error?null:count,failed:!!error}}));
 return <main id="main-content"><SiteNav/><header><div className="eyebrow">КАЧЕСТВО ДАННЫХ</div><h1 className="detailTitle">Что действительно опубликовано</h1><p className="lead">Счётчики читают базу с правами обычного посетителя. Закрытые черновики, тестовые гонки и служебные журналы сюда не входят.</p></header><div className="mediaGrid">{counts.map(c=><article className="panel" key={c.label}><small>{c.failed?'ЗАПРОС НЕ УДАЛСЯ':'ПУБЛИЧНАЯ БАЗА'}</small><h2>{c.value ?? '—'}</h2><p>{c.label}</p></article>)}</div><div className="notice">Это состояние базы, а не доказательство непрерывной работы импортёров. Доступность сайта федерации, успешный разбор документа и внесение проверенных изменений — три разные проверки.</div></main>;
}
