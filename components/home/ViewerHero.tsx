import Link from 'next/link';
import {ArrowUpRight,ArrowRight} from 'lucide-react';
import cover from '../../content/visual/viewer-cover.json';
import styles from './ViewerHome.module.css';
export function ViewerHero(){const image=cover.variants[2];return <section className={styles.hero} aria-labelledby="home-title" data-viewer-hero>
 <img className={styles.cover} data-viewer-cover src={image.src} srcSet={cover.variants.map(v=>`${v.src} ${v.width}w`).join(', ')} sizes="(max-width: 700px) 100vw, (max-width: 1600px) calc(100vw - 48px), 1552px" width={image.width} height={image.height} alt="" loading="eager" fetchPriority="high" decoding="async"/>
 <div className={styles.heroCopy}><p className={styles.eyebrow}><span aria-hidden="true"/> БИАТЛОН И ЛЫЖНЫЕ ГОНКИ · 2026/27</p><h1 id="home-title">Ваш календарь<br/>зимних гонок<span>.</span></h1><p className={styles.intro}>От первого старта до финала сезона. Расписание, трансляции и истории, которые помогают быть ближе к гонкам.</p><nav className={styles.heroActions} aria-label="Быстрый доступ к сезону"><Link className={styles.primary} href="/calendar" aria-label="Открыть календарь сезона">Открыть календарь <ArrowUpRight size={18} aria-hidden="true"/></Link><Link className={styles.secondary} href="/watch">Где смотреть <ArrowRight size={17} aria-hidden="true"/></Link></nav><p className={styles.heroNote}>Россия и мир <span aria-hidden="true">/</span> Время стартов — по Москве</p></div>
 <Link className={styles.photoCredit} href="/photo-credits#winter-landscape">Ла-Розьер, Французские Альпы · фото и автор ↗</Link>
 </section>}
