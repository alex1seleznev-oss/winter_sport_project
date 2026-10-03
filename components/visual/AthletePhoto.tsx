'use client';
import {useEffect,useRef,useState} from 'react';import type {AthleteVisual} from '../../lib/athlete-visuals';import styles from './FullScreen.module.css';
/** Displays audited photograph bytes. No canvas, facial synthesis, colour filter or equipment replacement. */
export function AthletePhoto({photo,eager=false}:{photo:AthleteVisual;eager?:boolean}){
 const [failed,setFailed]=useState(false),image=useRef<HTMLImageElement>(null),fallback=photo.variants.find(v=>v.width===1280)||photo.variants[0];
 useEffect(()=>{const el=image.current;if(!el)return;const sync=()=>setFailed(el.complete&&el.naturalWidth===0);el.addEventListener('load',sync);el.addEventListener('error',sync);sync();return()=>{el.removeEventListener('load',sync);el.removeEventListener('error',sync)}},[photo.key]);
 return <div className={styles.photo} data-star-photo data-photo-key={photo.key} data-low-resolution={!photo.highResolution} data-photo-failed={failed} data-original-sha256={photo.sourceSha256}><img ref={image} key={photo.key} src={fallback.src} srcSet={photo.variants.map(v=>`${v.src} ${v.width}w`).join(', ')} sizes={photo.highResolution?'(max-width: 700px) 100vw, 74vw':'285px'} width={fallback.width} height={fallback.height} alt={`${photo.name}. ${photo.scene}. Реальная архивная фотография.`} loading={eager?'eager':'lazy'} fetchPriority={eager?'high':'auto'} decoding="async" onError={()=>setFailed(true)} onLoad={()=>setFailed(false)}/>{failed&&<span className={styles.imageFailure} role="status">Фотография временно недоступна. Материалы и календарь работают.</span>}</div>;
}
