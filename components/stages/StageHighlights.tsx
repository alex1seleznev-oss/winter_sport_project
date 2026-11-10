'use client';
import {useState} from 'react';
import {Play,ExternalLink} from 'lucide-react';
import type {StageHighlight} from '../../lib/stage-highlights.mjs';
import styles from './Stages.module.css';

/** Video provider is not contacted until the visitor asks to play. */
export function StageHighlights({video}:{video:StageHighlight}){
 const [playing,setPlaying]=useState(false);
 return <section id="previous-season-highlights" className={styles.highlightSection} aria-labelledby="previous-highlights-title">
  <div className={styles.highlightHeading}>
   <div><p className={styles.highlightEyebrow}>ВИДЕОАРХИВ · {video.season}</p><h2 id="previous-highlights-title">Каким был этап в прошлом сезоне</h2><p>{video.title}. Официальная подборка IBU: архивные кадры, не трансляция сезона 2026/27.</p></div>
  </div>
  <div className={styles.highlightPlayer}>
   {playing?
    <iframe title={video.title} src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:
    <button type="button" className={styles.highlightPlayButton} aria-label={`Воспроизвести архивное видео: ${video.title}`} onClick={()=>setPlaying(true)}>
     {/* Official video thumbnail, not a repurposed independent event photo. */}
     <img src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`} alt="" width={480} height={360} loading="lazy" decoding="async"/>
     <span className={styles.highlightPlayIcon}><Play size={28} fill="currentColor" aria-hidden="true"/></span><span className={styles.highlightPlayText}>Смотреть лучшие моменты</span>
    </button>}
  </div>
  <p className={styles.highlightCredits}>Видео: {video.publisher} · {video.eventYear}. Плеер YouTube загружается только после нажатия. <a href={video.sourceUrl} target="_blank" rel="noopener noreferrer">Открыть на YouTube <ExternalLink size={13} aria-hidden="true"/></a></p>
 </section>;
}
