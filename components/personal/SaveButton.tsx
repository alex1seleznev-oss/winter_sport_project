'use client';
import {Bookmark,BookmarkCheck} from 'lucide-react';import {useSelection} from './SelectionProvider';import styles from './Personal.module.css';
export function SaveButton({kind,id,label,compact=false}:{kind:'stage'|'race';id:number;label:string;compact?:boolean}){
 const {selection,mode,toggle}=useSelection();const on=(kind==='stage'?selection.stages:selection.races).includes(id);const Icon=on?BookmarkCheck:Bookmark;
 return <button type="button" className={`${styles.save} ${compact?styles.compact:''}`} aria-pressed={on} disabled={mode==='loading'} aria-label={`${on?'Убрать из':'Добавить в'} «Мой сезон»: ${label}`} title="Выбор хранится только в этом браузере; уведомления не подключаются" onClick={()=>toggle(kind,id)}><Icon size={17} aria-hidden="true"/>{!compact&&<span>{on?'В моём сезоне':'В мой сезон'}</span>}</button>;
}
