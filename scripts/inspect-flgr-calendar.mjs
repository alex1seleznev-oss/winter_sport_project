// Fixed-source parser diagnostics. No imports into the database.
import {mkdirSync,writeFileSync} from 'node:fs';
import {load} from 'cheerio';
import {fetchOfficialHtml} from './lib/fetch-official.mjs';
const {html,...provenance}=await fetchOfficialHtml('https://flgr-results.ru/calendar');
const $=load(html);$('script,style,noscript,template').remove();
const rows=$('tr').toArray().map(tr=>({cells:$(tr).find('th,td').toArray().map(td=>$(td).text().replace(/\s+/gu,' ').trim()),links:$(tr).find('a[href]').toArray().map(a=>({text:$(a).text().trim(),href:$(a).attr('href')}))}));
const report={provenance,rows:rows.slice(0,60),selects:$('select').toArray().map(s=>({name:$(s).attr('name'),id:$(s).attr('id'),options:$(s).find('option').toArray().map(o=>({value:$(o).attr('value'),text:$(o).text().trim(),selected:$(o).is('[selected]')}))}))};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/flgr-calendar-dom.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
