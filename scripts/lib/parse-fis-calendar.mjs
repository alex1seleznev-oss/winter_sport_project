const months={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
export function parseFisCalendar(html){
 const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ');
 const re=/(\d{2})(?:-(\d{2}))?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+([^\d]{2,60}?)\s+(WC|SWC|WSC|SCAN)\s+([^\n]{0,160}?)(?=(?:\d{2})(?:-\d{2})?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|$)/g;
 const out=[];let m;
 while((m=re.exec(text))){out.push({start_date:`${m[4]}-${months[m[3]]}-${m[1]}`,end_day:m[2]||m[1],place:m[5].trim(),category:m[6],raw:m[7].trim().slice(0,300)});}
 return out;
}