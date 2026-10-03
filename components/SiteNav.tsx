'use client';
import Link,{useLinkStatus} from 'next/link';import {usePathname} from 'next/navigation';import {useEffect,useRef} from 'react';import {House,CalendarDays,MapPin,Bookmark,BookOpen} from 'lucide-react';
import {useSelection} from './personal/SelectionProvider';import {activeArea} from '../lib/navigation.mjs';import styles from './navigation/Navigation.module.css';
const main=[{id:'home',href:'/',title:'Главная',Icon:House},{id:'calendar',href:'/calendar',title:'Календарь',Icon:CalendarDays},{id:'stages',href:'/competitions',title:'Этапы',Icon:MapPin},{id:'saved',href:'/my-season',title:'Мой сезон',Icon:Bookmark},{id:'guides',href:'/guides',title:'Гид',Icon:BookOpen}];
const other=[{id:'media',href:'/media',title:'Материалы'},{id:'sources',href:'/sources',title:'Источники'},{id:'changes',href:'/changes',title:'Что изменилось'},{id:'health',href:'/data-health',title:'Качество данных'}];
function Hint(){const {pending}=useLinkStatus();return <span aria-hidden="true" data-pending={pending} className={styles.hint}/>}
export function SiteNav(){
 const path=usePathname(),active=activeArea(path),{selection}=useSelection(),menu=useRef<HTMLDetailsElement>(null);const count=selection.stages.length+selection.races.length;
 useEffect(()=>{if(menu.current)menu.current.open=false},[path]);
 return <>
  <div className={styles.top}><Link className={styles.brand} href="/" aria-label="Winter Sports Hub — главная">WSH<span>WINTER SPORTS HUB</span></Link>
   <nav className={styles.links} aria-label="Основная навигация">{main.map(item=><Link href={item.href} key={item.id} aria-current={item.id===active?'page':undefined} prefetch={item.id==='saved'?false:undefined}>{item.id==='saved'&&<Bookmark size={14} aria-hidden="true"/>}{item.title}{item.id==='saved'&&count>0&&<span className={styles.counter}>{count}</span>}<Hint/></Link>)}{other.filter(i=>i.id!=='changes').map(item=><Link href={item.href} key={item.id} aria-current={item.id===active?'page':undefined}>{item.title}</Link>)}</nav>
   <details className={styles.mobileMenu} ref={menu} onKeyDown={e=>{if(e.key==='Escape'&&menu.current){menu.current.open=false;menu.current.querySelector('summary')?.focus()}}}><summary>Меню</summary><div className={styles.menuLinks}>{[...main,...other,{id:'subscribe',href:'/calendar/subscribe',title:'Календарь в телефон'}].map(item=><Link key={item.id} href={item.href} aria-current={item.id===active?'page':undefined} onClick={()=>{if(menu.current)menu.current.open=false}}>{item.title}</Link>)}</div></details>
  </div>
  <nav className={styles.bottom} aria-label="Мобильная навигация">{main.map(item=><Link key={item.id} href={item.href} prefetch={false} aria-current={item.id===active?'page':undefined}><item.Icon size={19} aria-hidden="true"/><span>{item.title}</span>{item.id==='saved'&&count>0&&<span className={styles.counter} aria-label={`Сохранено позиций: ${count}`}>{count}</span>}<Hint/></Link>)}</nav>
 </>;
}
