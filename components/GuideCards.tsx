import Link from 'next/link';
import type {Guide} from '../lib/guides';
export function GuideCards({items}:{items:Guide[]}){return <div className="guideGrid">{items.map((g,i)=><article className={'guideCard '+(g.sport==='biathlon'?'guideBio':'')} key={g.slug}><div className="guideNumber" aria-hidden="true">{String(i+1).padStart(2,'0')}</div><small>{g.category} · около {g.readMinutes} мин</small><h2><Link href={`/guides/${g.slug}`}>{g.title}</Link></h2><p>{g.description}</p><Link href={`/guides/${g.slug}`} aria-label={`Читать: ${g.title}`}>Разобраться →</Link></article>)}</div>}
