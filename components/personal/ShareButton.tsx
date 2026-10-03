'use client';
import {useId,useState} from 'react';import {Share2} from 'lucide-react';import {publicEntityPath} from '../../lib/navigation.mjs';import styles from './Personal.module.css';
export function ShareButton({kind,id,title}:{kind:'stage'|'race';id:number;title:string}){
 const [url,setUrl]=useState(''),[message,setMessage]=useState('');const field=useId();
 async function share(){
  const value=new URL(publicEntityPath(kind,id),window.location.origin).href;
  if(navigator.share){try{await navigator.share({url:value,title});setMessage('Ссылка передана приложению.');return}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return}}
  setUrl(value);try{await navigator.clipboard.writeText(value);setMessage('Ссылка скопирована.')}catch{setMessage('Скопируйте ссылку из поля ниже.')}
 }
 return <div className={styles.share}><button type="button" onClick={share}><Share2 size={16} aria-hidden="true"/>Поделиться</button>{url&&<div><label htmlFor={field}>Ссылка на {kind==='stage'?'этап':'гонку'}</label><input id={field} value={url} readOnly onFocus={e=>e.currentTarget.select()}/></div>}<p role="status">{message}</p></div>;
}
