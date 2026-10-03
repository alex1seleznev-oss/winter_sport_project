'use client';
import {createContext,useContext,useEffect,useState,useRef,useCallback} from 'react';
import {decodeSelection,emptySelection,toggleSelection,SELECTION_KEY,type Selection} from '../../lib/selection.mjs';
type Mode='loading'|'local'|'memory'|'invalid';
type Store={selection:Selection;mode:Mode;message:string;toggle:(kind:'stage'|'race',id:number)=>void;clear:()=>void};
const Context=createContext<Store|null>(null);
export function SelectionProvider({children}:{children:React.ReactNode}){
 const [selection,setSelection]=useState<Selection>(emptySelection),[mode,setMode]=useState<Mode>('loading'),[message,setMessage]=useState('');
 const current=useRef(selection),currentMode=useRef<Mode>('loading');
 const install=useCallback((value:Selection,nextMode:Mode)=>{current.current=value;currentMode.current=nextMode;setSelection(value);setMode(nextMode)},[]);
 useEffect(()=>{
  function read(){try{const parsed=decodeSelection(window.localStorage.getItem(SELECTION_KEY));install(parsed.selection,parsed.error?'invalid':'local')}catch{install(current.current,'memory')}}
  read();const update=(event:StorageEvent)=>{if(event.key===SELECTION_KEY||event.key===null)read()};
  window.addEventListener('storage',update);return ()=>window.removeEventListener('storage',update);
 },[install]);
 const toggle=useCallback((kind:'stage'|'race',id:number)=>{
  if(currentMode.current==='loading')return;
  let base=current.current;
  if(currentMode.current!=='memory'){try{const parsed=decodeSelection(window.localStorage.getItem(SELECTION_KEY));if(!parsed.error)base=parsed.selection}catch{currentMode.current='memory'}}
  try{
   const next=toggleSelection(base,kind,id);let nextMode:Mode='local';
   try{window.localStorage.setItem(SELECTION_KEY,JSON.stringify(next))}catch{nextMode='memory'}
   install(next,nextMode);const selected=(kind==='stage'?next.stages:next.races).includes(id);
   setMessage(`${selected?'Добавлено в «Мой сезон»':'Удалено из избранного'}${nextMode==='memory'?' — только до перезагрузки вкладки.':'. Сохранено в этом браузере.'}`);
  }catch{setMessage('Лимит избранного достигнут или запись недоступна. Удалите ненужные позиции.')}
 },[install]);
 const clear=useCallback(()=>{
  try{window.localStorage.removeItem(SELECTION_KEY);install(emptySelection(),'local');setMessage('Выборка удалена из этого браузера. Другие настройки сайта не затронуты.')}
  catch{install(emptySelection(),'memory');setMessage('Выборка очищена в этой вкладке. Браузер не разрешил удалить ранее сохранённую копию; проверьте настройки хранения.')}
 },[install]);
 return <Context.Provider value={{selection,mode,message,toggle,clear}}>{children}<div className="selectionNotice" role="status" aria-live="polite" aria-atomic="true">{message}</div></Context.Provider>;
}
export function useSelection(){const store=useContext(Context);if(!store)throw new Error('SELECTION_PROVIDER_REQUIRED');return store}
