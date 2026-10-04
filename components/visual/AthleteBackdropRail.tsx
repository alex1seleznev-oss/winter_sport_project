import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {athleteVisuals} from '../../lib/athlete-visuals';
import styles from './AthleteBackdropRail.module.css';

export function AthleteBackdropRail(){
 const photos=athleteVisuals.filter(p=>p.highResolution).slice(0,4);
 return <section className={styles.band} aria-labelledby="athlete-backdrop-title">
  <div className={styles.copy}>
   <span className={styles.kicker}>ЛИЦА ЗИМЫ / ФОТОХРОНИКА</span>
   <h2 id="athlete-backdrop-title">Истории остаются<br/>в кадре.</h2>
   <p>Реальные фотографии спортсменов становятся частью навигации и атмосферы сайта — с сохранённой личностью, экипировкой и источником каждого кадра.</p>
   <div className={styles.links}><Link href="/athletes">Открыть фотоархив <ArrowUpRight size={17} aria-hidden="true"/></Link><Link href="/photo-credits">Авторы и лицензии →</Link></div>
  </div>
  <div className={styles.grid}>
   {photos.map((p,i)=>{const v=p.variants.find(v=>v.width===1280)||p.variants.at(-1)||p.variants[0];return <Link href={p.href} className={styles.panel} key={p.key} data-athlete={p.key} data-index={i} style={{backgroundImage:`url("${v.src}")`}} aria-label={`${p.name}: ${p.cta}`}><span className={styles.panelShade}/><span className={styles.meta}><small>{p.sport}</small><strong>{p.family}</strong><em>{p.scene}</em></span></Link>})}
  </div>
 </section>;
}
