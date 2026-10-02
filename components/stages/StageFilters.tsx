import Link from 'next/link';import {Search} from 'lucide-react';import type {StageFilters as FilterValues} from '../../lib/stage-catalog.mjs';import styles from './Stages.module.css';
const months=[['2026-11','Ноябрь'],['2026-12','Декабрь'],['2027-01','Январь'],['2027-02','Февраль'],['2027-03','Март'],['2027-04','Апрель']];
export function StageFilters({values,programmeUnavailable=false}:{values:FilterValues;programmeUnavailable?:boolean}){
 return <details style={{border:'1px solid #304255',borderRadius:12,marginBottom:22,background:'#0d1722'}}>
 <summary style={{padding:'15px 20px',cursor:'pointer',fontSize:14,color:'#c8deed'}}>Поиск и фильтры{Object.values(values).some(Boolean)?' · применены':''}</summary>
 <form action="/competitions" className={styles.filters} method="get" aria-label="Фильтры этапов" style={{border:0,marginBottom:0}}>
  <label htmlFor="stage-sport">Вид спорта<select name="sport" id="stage-sport" defaultValue={values.sport}><option value="">Все виды</option><option value="biathlon">Биатлон</option><option value="cross_country">Лыжные гонки</option></select></label>
  <label htmlFor="stage-scope">Серия<select name="scope" id="stage-scope" defaultValue={values.scope}><option value="">Россия и мир</option><option value="russia">Россия</option><option value="international">Международные</option></select></label>
  <label htmlFor="stage-month">Месяц<select name="month" id="stage-month" defaultValue={values.month}><option value="">Весь сезон</option>{months.map(([v,t])=><option key={v} value={v}>{t} {v.slice(0,4)}</option>)}</select></label>
  <label htmlFor="stage-status">Статус<select name="status" id="stage-status" defaultValue={values.status}><option value="">Все статусы</option><option value="scheduled">В календаре</option><option value="provisional">Только проекты</option><option value="cancelled">Отменённые</option></select></label>
  <label htmlFor="stage-programme">Наполнение<select name="programme" id="stage-programme" defaultValue={values.programme} disabled={programmeUnavailable}><option value="">Все этапы</option><option value="available">Есть гонки в базе</option><option value="pending">Пока только даты</option></select></label>
  <label htmlFor="stage-search" className={styles.searchLabel}>Поиск места или соревнования<span className={styles.searchInput}><Search size={16} aria-hidden="true"/><input id="stage-search" name="q" type="search" maxLength={80} defaultValue={values.q} placeholder="Контиолахти, Казань, Tour de Ski…"/></span></label>
  <div className={styles.filterActions}><button type="submit">Показать этапы</button><Link href="/competitions">Сбросить</Link></div>
 </form></details>;
}
