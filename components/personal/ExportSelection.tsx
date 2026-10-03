'use client';
import {useState} from 'react';import {Download} from 'lucide-react';import {MAX_RACES} from '../../lib/selection.mjs';import styles from './Personal.module.css';
export function ExportSelection({ids}:{ids:number[]}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function download(){setBusy(true);setMessage('');try{
  const r=await fetch('/api/my-season.ics',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids}),signal:AbortSignal.timeout(15000)});
  if(!r.ok){setMessage(r.status===409?'Опубликованная выборка изменилась. Обновите страницу перед экспортом.':'Экспорт сейчас недоступен. Повторите позже.');return}
  if(!r.headers.get('content-type')?.includes('text/calendar'))throw new Error('INVALID_EXPORT');
  const blob=await r.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='winter-sports-my-season.ics';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),10000);setMessage('ICS-файл подготовлен. Это разовая копия, не подписка на обновления.');
 }catch{setMessage('Не удалось скачать календарь. Проверьте соединение и повторите.')}finally{setBusy(false)}}
 return <div className={styles.export}><button type="button" onClick={download} disabled={busy||!ids.length||ids.length>MAX_RACES}><Download size={16} aria-hidden="true"/>{busy?'Готовим файл…':'Скачать выбранные гонки'}</button><p role="status">{ids.length>MAX_RACES?`Для одного файла выберите не больше ${MAX_RACES} гонок.`:message}</p></div>;
}
