// Presentation-only helpers. Original federation labels remain in the database.
export function disciplineLabel(value){
 if(typeof value!=='string')return 'Дисциплина уточняется';
 const s=value.trim();
 if(/[А-Яа-яЁё]/u.test(s))return s;
 const m=s.match(/^(?:(\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)?)\s*km\s+)?(Interval Start|Interval|Heat Mass Start|Mass Start|Team Sprint Qualification|Team Sprint Final|Team Sprint|Sprint Qualification|Sprint Final|Sprint|Mixed Relay|Relay|Pursuit|Skiathlon)(?:\s+(Classic\/Free|Classic|Free|C|F))?$/i);
 if(!m)return s; // Do not guess unknown formats.
 const names={'interval start':'Раздельный старт',interval:'Раздельный старт','heat mass start':'Масс-старт по забегам','mass start':'Масс-старт','team sprint':'Командный спринт','team sprint qualification':'Командный спринт — квалификация','team sprint final':'Командный спринт — финал','sprint qualification':'Спринт — квалификация','sprint final':'Спринт — финал',sprint:'Спринт','mixed relay':'Смешанная эстафета',relay:'Эстафета',pursuit:'Гонка преследования',skiathlon:'Скиатлон'};
 const styles={c:'классический стиль',classic:'классический стиль',f:'свободный стиль',free:'свободный стиль','classic/free':'классический / свободный стиль'};
 return [names[m[2].toLowerCase()],m[1]?m[1].replaceAll('x',' × ').replace('.',',')+' км':null,m[3]?styles[m[3].toLowerCase()]:null].filter(Boolean).join(' · ');
}
export function raceLabel(race){const title=disciplineLabel(race.discipline);return race.distance?`${title} · ${race.distance}`:title}
export function normalizeViewerFilters(params={}){
 const one=(key,allowed)=>typeof params[key]==='string'&&allowed.includes(params[key])?params[key]:undefined;
 const raw=typeof params.q==='string'?params.q:'';
 return {sport:one('sport',['biathlon','cross_country']),scope:one('scope',['russia','international']),gender:one('gender',['men','women','mixed']),state:one('state',['not_cancelled','cancelled']),when:one('when',['today','tomorrow','week'])||'season',q:raw.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,80)};
}
const fold=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('ru-RU').replaceAll('ё','е');
const cities={ruka:'рука',trondheim:'тронхейм',davos:'давос',falun:'фалун',oslo:'осло',drammen:'драммен',toblach:'тоблах доббьяко',konta:'контиолахти'};
// Known clocks determine order. For equal/unknown clocks, round order is displayed without inventing a start.
export function compareProgrammeRaces(a,b){
 const group=r=>Number.isSafeInteger(r.competition_id)?r.competition_id:Number.MAX_SAFE_INTEGER;
 const phase=r=>/Sprint.*Qualification/i.test(r.discipline)?0:/Sprint/i.test(r.discipline)?2:1;
 const id=r=>Number.isSafeInteger(r.id)?r.id:0;
 return String(a.event_date||'').localeCompare(String(b.event_date||''))||
  String(a.start_time_msk||'99').localeCompare(String(b.start_time_msk||'99'))||
  group(a)-group(b)||phase(a)-phase(b)||id(a)-id(b);
}
export function filterViewerRaces(races,filters){
 const tokens=fold(filters.q).split(/\s+/).filter(Boolean);
 return races.filter(r=>{
  if(filters.gender&&r.gender!==filters.gender)return false;
  if(filters.state==='not_cancelled'&&r.status==='cancelled')return false;
  if(filters.state==='cancelled'&&r.status!=='cancelled')return false;
  const location=fold(r.location);const aliases=Object.entries(cities).filter(([key])=>location.includes(key)).map(([,v])=>v).join(' ');
  const haystack=fold([r.discipline,disciplineLabel(r.discipline),r.distance,r.location,r.series,r.country,aliases].join(' '));
  return tokens.every(t=>haystack.includes(t));
 }).sort(compareProgrammeRaces);
}
export function coverage(races){return {total:races.length,dated:races.filter(r=>!!r.event_date).length,timed:races.filter(r=>!!r.start_time_msk).length,cancelled:races.filter(r=>r.status==='cancelled').length,tentative:races.filter(r=>['tentative','provisional'].includes(r.status)).length}}
export function calendarFeedPath(filters={}){const p=new URLSearchParams();for(const k of ['sport','scope','gender'])if(filters[k])p.set(k,filters[k]);return '/api/calendar.ics'+(p.size?'?'+p:'')}
