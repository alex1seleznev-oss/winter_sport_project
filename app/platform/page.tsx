import Link from 'next/link';
import {SiteNav} from '../../components/SiteNav';
import {pageMetadata} from '../../lib/seo';
import {createClient} from '@supabase/supabase-js';
import {readOperationsSnapshot,type OperationsSnapshot} from '../../lib/agents/operations.mjs';
import workers from '../../config/agents/workers.json';
import styles from './Platform.module.css';

export const dynamic='force-dynamic';
export const metadata=pageMetadata('Состояние помощников и редакции','Реальные очереди, исполнители и границы публикации Winter Sports Hub.','/platform',false);
const names:Record<string,string>={'media-watch':'Сбор источников','photo-scout':'Поиск фотографий','media-curator':'Проверка медиатеки',research:'Исследование','fact-check':'Проверка фактов','editorial-writer':'Редактор','visual-director':'Оформление',qa:'Контроль качества',publisher:'Публикация',orchestrator:'Маршрутизация'};
const modes:Record<string,string>={'github-action':'Сбор по расписанию','model-runtime':'Модельный исполнитель','deterministic-qa':'Проверка без модели','deterministic-publisher':'Выпуск материала',internal:'Внутренний модуль'};
const summaries:Record<string,string>={unknown:'Телеметрия недоступна',attention:'Есть задания с ошибками',review:'Материалы ждут проверки',running:'Есть задания в работе',ready:'Есть готовые задания',idle:'Нет готовых заданий'};
function time(value:string|null){return value?new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Moscow'}).format(new Date(value))+' МСК':'Нет данных'}
async function snapshot():Promise<OperationsSnapshot>{
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('OPERATIONS_NOT_CONFIGURED');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:init?.signal??AbortSignal.timeout(10000)})}});
  return await readOperationsSnapshot(client);
 }
 catch{return {available:false,checkedAt:new Date().toISOString(),counts:null,readyCandidates:null,readyCapped:false,latestCompletedAt:null,state:'unknown'}}
}
export default async function Platform(){
 const data=await snapshot(),count=(key:'queued'|'running'|'review'|'failed'|'legacy')=>data.counts?.[key]??'—';
 return <main id="main-content"><SiteNav/>
  <header className={styles.header}><div><span className={styles.kicker}>WINTER SPORTS HUB / КОНТРОЛЬ РАБОТЫ</span><h1>От источника<br/><span>до публикации.</span></h1><p>Состояние очередей на момент загрузки страницы. Включённый исполнитель и завершённая работа показаны отдельно.</p></div><div className={styles.signal} data-state={data.state}><span>{summaries[data.state]}</span><small>Проверка: {time(data.checkedAt)}</small><small>Последний завершённый вызов модели: {time(data.latestCompletedAt)}</small></div></header>
  {!data.available&&<p className={styles.notice} role="status">Не удалось получить состояние закрытых очередей. Прочерки означают отсутствие данных, а не отсутствие ошибок. Параметры подключения и содержимое заданий здесь не выводятся.</p>}
  <section className={styles.metrics} aria-label="Состояние очередей">
   {[['Готовы к исполнению',data.readyCandidates===null?'—':String(data.readyCandidates)+(data.readyCapped?'+':''),'Прошли условия зависимостей и допуска.'],['В работе',count('running'),'Задания в состоянии running.'],['Нужна проверка',count('review'),'Сюда входит приём наблюдений из медиа.'],['Ошибки',count('failed'),'Задания, завершившиеся неудачно.']].map(([label,value,note])=><article key={label}><small>{label}</small><strong>{value}</strong><p>{note}</p></article>)}
  </section>
  <section className={styles.flow} aria-label="Путь материала">
   {[['01','Собрать','Новые сообщения и изменения поступают в отдельную очередь.'],['02','Подтвердить','Исследование и проверка фактов работают с сохранёнными доказательствами.'],['03','Подготовить','Редактор создаёт черновик, затем выполняется контроль качества.'],['04','Выпустить','Публикация отключена до подключения проверенного адаптера выпуска.']].map(([n,title,text])=><article key={n}><span>{n}</span><h2>{title}</h2><p>{text}</p></article>)}
  </section>
  <section className={styles.queue}><div><span className={styles.kicker}>ПЕРЕДАЧА МАТЕРИАЛОВ</span><h2>Что ожидает следующего шага</h2><p>Ожидание проверки не означает сбой сборщика. Старые задания превью и итогов не выполняются новым движком автоматически.</p></div><dl><div><dt>Очередь нового движка</dt><dd>{count('queued')}</dd></div><div><dt>Старая редакционная очередь</dt><dd>{count('legacy')}</dd></div></dl></section>
  <section className={styles.workers}><div className={styles.sectionHead}><h2>Исполнители</h2><p>Настройки кода, а не подтверждение последнего успешного запуска.</p></div><div className={styles.workerGrid}>{Object.entries(workers.workers).map(([id,worker])=><article key={id}><div><h3>{names[id]||id}</h3><span data-enabled={worker.enabled}>{worker.enabled?'Включён':'Отключён'}</span></div><p>{modes[worker.mode]||worker.mode}</p>{id==='publisher'&&<small>Готовый черновик ещё не является опубликованной статьёй.</small>}</article>)}</div></section>
  <div className={styles.footerLinks}><Link href="/data-health">Качество календаря ↗</Link><Link href="/methodology">Как проверяются факты ↗</Link><Link href="/media">Опубликованные материалы ↗</Link></div>
 </main>;
}
