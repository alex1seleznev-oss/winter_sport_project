import {cache} from 'react';
import {notFound} from 'next/navigation';
import {SiteNav} from '../../../components/SiteNav';
import {pageMetadata} from '../../../lib/seo';
import {supabase} from '../../../lib/supabase';
const profile=cache(async(id:string)=>{
 if(!/^[1-9][0-9]{0,17}$/.test(id))notFound();
 const {data,error}=await supabase.from('athletes').select('id,full_name,sport,nation').eq('id',id).maybeSingle();
 if(error)throw new Error('ATHLETE_PROFILE_UNAVAILABLE');
 if(!data)notFound();
 return data;
});
export async function generateMetadata({params}:{params:Promise<{id:string}>}){
 const {id}=await params,a=await profile(id);
 // Profiles remain noindex until evidence-backed biographies and completeness checks exist.
 return pageMetadata(a.full_name+' — результаты и история','Карточка спортсмена '+a.full_name+' в Winter Sports Hub.','/athletes/'+id,false);
}
export default async function Athlete({params}:{params:Promise<{id:string}>}){const {id}=await params;const a=await profile(id);const [{data:r},{data:t},{data:h}]=await Promise.all([supabase.from('athlete_results').select('*,events(event_date,discipline,distance,location,series)').eq('athlete_id',id).order('result_date',{ascending:false}),supabase.from('athlete_timeline').select('*').eq('athlete_id',id).order('occurred_at',{ascending:false}).limit(30),supabase.from('analysis_hypotheses').select('*').eq('athlete_id',id).order('created_at',{ascending:false}).limit(20)]);return <main id="main-content"><SiteNav/><header><div className="eyebrow">{a.sport==='biathlon'?'БИАТЛОН':'ЛЫЖНЫЕ ГОНКИ'} · {a.nation||'—'}</div><h1>{a.full_name}</h1><p className="lead">История результатов, контекст и проверяемые аналитические гипотезы.</p></header><div className="grid"><section><small>РЕЗУЛЬТАТЫ</small><div className="races">{(r||[]).map((x:any)=><article className="race ski" key={x.id}><div className="date"><b>#{x.rank||'—'}</b><span>{x.result_date}</span></div><div className="raceMain"><h3>{x.events?.discipline} {x.events?.distance||''}</h3><p>{x.events?.location} · отставание {x.time_behind_seconds??'—'} с</p></div></article>)}</div></section><aside><div className="panel"><small>ХРОНИКА</small><h2>{t?.length||0}</h2><p>событий и материалов</p></div><div className="panel"><small>АНАЛИТИКА</small><h2>{h?.length||0}</h2><p>проверяемых выводов</p></div></aside></div></main>}