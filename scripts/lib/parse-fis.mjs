export function parseFisResults(html){
 const text=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 const marker=text.toLowerCase().indexOf('official results');
 if(marker<0)return [];
 const body=text.slice(marker);
 const re=/(\d+)\s+(\d+)\s+([A-ZÀ-ÖØ-Ý' -]{3,}?)\s+(\d{4})\s+([A-Z]{3})\s+((?:\d+:)?\d+:\d+(?:\.\d+)?|\+?(?:\d+:)?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g;
 const rows=[]; let m;
 while((m=re.exec(body))&&rows.length<300) rows.push({rank:+m[1],bib:+m[2],athlete:m[3].trim(),year:+m[4],nation:m[5],time_raw:m[6],fis_points:+m[7]});
 return rows;
}
export function seconds(raw){if(!raw)return null;const s=raw.replace(/^\+/,'');const p=s.split(':').map(Number);if(p.some(Number.isNaN))return null;return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:p[0]}
