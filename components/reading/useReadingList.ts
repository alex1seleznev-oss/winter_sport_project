'use client';
import {useSyncExternalStore} from 'react';
import {READING_KEY,emptyReading,parseReading,changeReading,type ReadingData,type ReadingAction} from '../../lib/reading-list.mjs';
type Snapshot={status:'loading'|'ready'|'corrupt'|'blocked';data:ReadingData;error:string};
const server:Snapshot={status:'loading',data:emptyReading(),error:''};let snapshot=server;
const listeners=new Set<()=>void>();
function publish(next:Snapshot){snapshot=next;for(const f of listeners)f()}
function load(){try{let data;try{data=parseReading(window.localStorage.getItem(READING_KEY))}catch(error){if(error instanceof Error&&error.message==='READING_INVALID'){publish({status:'corrupt',data:emptyReading(),error:'Сохранённый список повреждён или использует неизвестный формат. Он не перезаписан.'});return}throw error}publish({status:'ready',data,error:''})}catch{publish({status:'blocked',data:emptyReading(),error:'Браузер запретил доступ к локальному списку. Сохранение недоступно, чтение статей работает.'})}}
function storageChanged(e:StorageEvent){if(e.key===READING_KEY||e.key===null){try{if(e.storageArea===window.localStorage)load()}catch{load()}}}
function subscribe(f:()=>void){listeners.add(f);if(listeners.size===1){window.addEventListener('storage',storageChanged);load()}return ()=>{listeners.delete(f);if(!listeners.size)window.removeEventListener('storage',storageChanged)}}
function mutate(action:ReadingAction){
 try{
  // Re-read immediately before writing so a sequential tab action preserves newer changes.
  const raw=window.localStorage.getItem(READING_KEY);let latest;
  try{latest=parseReading(raw)}catch{load();return false}
  const data=changeReading(latest,action);const value=JSON.stringify(data);
  window.localStorage.setItem(READING_KEY,value);
  if(window.localStorage.getItem(READING_KEY)!==value){load();return false}
  publish({status:'ready',data,error:''});return true;
 }catch(error){const message=error instanceof Error&&error.message==='READING_LIMIT'?'В списке уже 100 материалов. Удалите ненужный, чтобы сохранить новый.':error instanceof Error&&error.message==='READING_NOT_SAVED'?'Материал уже удалён из списка в другой вкладке.':'Не удалось записать изменение. Оно не считается сохранённым; проверьте доступное место и настройки браузера.';publish({...snapshot,error:message});return false}
}
function reset(){try{window.localStorage.removeItem(READING_KEY);if(window.localStorage.getItem(READING_KEY)!==null)throw new Error('RESET_FAILED');publish({status:'ready',data:emptyReading(),error:''});return true}catch{publish({...snapshot,error:'Не удалось очистить список. Другие настройки браузера не изменены.'});return false}}
export function useReadingList(){const state=useSyncExternalStore(subscribe,()=>snapshot,()=>server);return {...state,mutate,reset,reload:load}}
