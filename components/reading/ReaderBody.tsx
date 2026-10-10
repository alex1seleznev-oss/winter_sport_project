'use client';
import {useEffect,useRef,useState} from 'react';import {Printer,Type} from 'lucide-react';import styles from './Reading.module.css';
export function ReaderBody({children}:{children:React.ReactNode}){
 const [large,setLarge]=useState(false),root=useRef<HTMLElement>(null),bar=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let cancelled=false,cleanup:undefined|(()=>void);const el=root.current,indicator=bar.current;if(!el||!indicator)return;
  // The content is readable before the optional animation bundle arrives.
  void Promise.all([import('gsap'),import('gsap/ScrollTrigger')]).then(([{gsap},{ScrollTrigger}])=>{
   if(cancelled)return;gsap.registerPlugin(ScrollTrigger);
   const ctx=gsap.context(()=>{const scale=gsap.quickSetter(indicator,'scaleX'),opacity=gsap.quickSetter(indicator,'opacity');const clamp=gsap.utils.clamp(0,1);
    const trigger=ScrollTrigger.create({trigger:el,start:'top top',end:'bottom bottom',onUpdate:self=>scale(clamp(self.progress)),onToggle:self=>opacity(self.isActive?1:0)});
    scale(clamp(trigger.progress));opacity(trigger.isActive?1:0);
    const observer=new ResizeObserver(()=>trigger.refresh());observer.observe(el);return()=>observer.disconnect();
   },el);cleanup=()=>ctx.revert();
  }).catch(()=>{});
  return()=>{cancelled=true;cleanup?.()};
 },[]);
 return <section ref={root} className={styles.reader} aria-label="Текст статьи"><div ref={bar} className={styles.progress} aria-hidden="true"/><div className={styles.textTools} data-reader-tools><button type="button" aria-pressed={large} onClick={()=>setLarge(!large)}><Type size={16} aria-hidden="true"/>Крупнее текст</button><button type="button" onClick={()=>window.print()}><Printer size={16} aria-hidden="true"/>Печать статьи</button></div><div className={large?styles.enlarged:styles.normal} data-reading-size={large?'large':'normal'}>{children}</div></section>;
}
