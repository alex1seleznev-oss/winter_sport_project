'use client';
import Link,{useLinkStatus} from 'next/link';
import {usePathname} from 'next/navigation';
import {useSelection} from './personal/SelectionProvider';
import {activeArea} from '../lib/navigation.mjs';
import styles from './navigation/Navigation.module.css';
const links=[{id:'calendar',href:'/calendar',title:'Календарь'},{id:'watch',href:'/watch',title:'Где смотреть'},{id:'media',href:'/media',title:'Материалы'},{id:'saved',href:'/my-season',title:'Мой сезон'}];
function Hint(){const {pending}=useLinkStatus();return <span aria-hidden="true" data-pending={pending} className={styles.hint}/>}
export function SiteNav(){
 const path=usePathname(),reader=path==='/media'||path.startsWith('/media/')||path==='/reading-list',area=activeArea(path),active=path==='/watch'||path.startsWith('/watch/')?'watch':area==='stages'?'calendar':area==='guides'||path==='/reading-list'?'media':area,{selection}=useSelection();
 const count=selection.stages.length+selection.races.length;
 return <div className={`${styles.top} ${path==='/'?styles.light:''}`}>
  <Link className={styles.brand} href="/" prefetch={reader?false:undefined} aria-label="Winter Sports Hub — главная"><b>WSH<span aria-hidden="true">.</span></b><span className={styles.wordmark}>WINTER<br/>SPORTS HUB</span></Link>
  <nav className={styles.links} aria-label="Основная навигация">{links.map(item=><Link href={item.href} key={item.id} aria-current={item.id===active?'page':undefined} prefetch={reader||item.id==='saved'?false:undefined}>{item.title}{item.id==='saved'&&count>0&&<span className={styles.counter} aria-label={`Сохранено позиций: ${count}`}>{count}</span>}<Hint/></Link>)}</nav>
 </div>;
}
