'use client';
import {useState} from 'react';
import {calendarFeedPath} from '../lib/viewer.mjs';
export function CalendarSubscribe(){
 const [sport,setSport]=useState(''),[scope,setScope]=useState(''),[gender,setGender]=useState('');
 const [message,setMessage]=useState(''),[url,setUrl]=useState('');
 const path=calendarFeedPath({sport:sport||undefined,scope:scope||undefined,gender:gender||undefined});
 async function copy(){const value=window.location.origin+path;setUrl(value);try{await navigator.clipboard.writeText(value);setMessage('Ссылка скопирована. Добавьте её как подписку в приложении календаря.')}catch{setMessage('Скопируйте ссылку из поля ниже.')}}
 function change(setter:(v:string)=>void,value:string){setter(value);setUrl('');setMessage('')}
 return <section className="panel"><h2>Выберите календарь сезона</h2>
  <div className="raceFilters">
   <div className="filterField"><label htmlFor="subscribe-sport">Вид спорта</label><select id="subscribe-sport" name="sport" value={sport} onChange={e=>change(setSport,e.target.value)}><option value="">Все виды</option><option value="biathlon">Биатлон</option><option value="cross_country">Лыжные гонки</option></select></div>
   <div className="filterField"><label htmlFor="subscribe-scope">Серия</label><select id="subscribe-scope" name="scope" value={scope} onChange={e=>change(setScope,e.target.value)}><option value="">Все серии</option><option value="russia">Россия</option><option value="international">Международные</option></select></div>
   <div className="filterField"><label htmlFor="subscribe-gender">Категория</label><select id="subscribe-gender" name="gender" value={gender} onChange={e=>change(setGender,e.target.value)}><option value="">Все категории</option><option value="women">Женщины</option><option value="men">Мужчины</option><option value="mixed">Смешанные</option></select></div>
  </div>
  <div className="heroLinks"><a className="primaryLink" href={path}>Скачать ICS</a><button type="button" onClick={copy}>Скопировать ссылку подписки</button></div>
  {url&&<div className="copyField"><label htmlFor="subscription-url">Ссылка подписки</label><input id="subscription-url" readOnly value={url} onFocus={e=>e.currentTarget.select()}/></div>}
  <p role="status" aria-live="polite">{message}</p><p className="metricNote">Подписка читает опубликованную часть нашей базы. Скачать файл — разовая копия. Если гонок ещё нет, файл будет пустым: даты этапов не превращаются в гонки автоматически.</p>
 </section>;
}
