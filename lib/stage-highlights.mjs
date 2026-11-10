// Hand-reviewed official player links. Never infer stage identity from a title or fetch timestamp.
const catalogue=Object.freeze([
 {competitionKey:'ibu-wc-2627-kontiolahti',sport:'biathlon',season:'2025/26',
  title:'Пять лучших моментов Контиолахти — Кайса Мякяряйнен',youtubeId:'JOYjBiJP67M',
  publisher:'Biathlonworld / IBU',publishedOn:'2026-03-09',eventYear:2026,
  sourceUrl:'https://www.youtube.com/watch?v=JOYjBiJP67M'},
 {competitionKey:'ibu-wc-2627-hochfilzen',sport:'biathlon',season:'2025/26',
  title:'Главные моменты Хохфильцена — Кристоф Зуманн',youtubeId:'KTYjAJBKC9A',
  publisher:'Biathlonworld / IBU',publishedOn:'2025-12-15',eventYear:2025,
  sourceUrl:'https://www.youtube.com/watch?v=KTYjAJBKC9A'}
]);
export function verifiedStageHighlight(entry){
 if(!entry||typeof entry!=='object'||!/^ibu-wc-2627-[a-z0-9-]+$/.test(entry.competitionKey)||entry.sport!=='biathlon'||entry.season!=='2025/26')return null;
 if(typeof entry.title!=='string'||entry.title.length<10||entry.title.length>180||entry.publisher!=='Biathlonworld / IBU')return null;
 if(typeof entry.youtubeId!=='string'||!/^[a-zA-Z0-9_-]{11}$/.test(entry.youtubeId))return null;
 if(entry.sourceUrl!==`https://www.youtube.com/watch?v=${entry.youtubeId}`)return null;
 if(!/^202[56]-\d\d-\d\d$/.test(entry.publishedOn)||![2025,2026].includes(entry.eventYear))return null;
 return entry;
}
export function highlightForStage(competitionKey,sport){
 if(sport!=='biathlon'||typeof competitionKey!=='string')return null;
 return catalogue.map(verifiedStageHighlight).find(entry=>entry?.competitionKey===competitionKey)??null;
}
export const reviewedStageHighlights=catalogue;
