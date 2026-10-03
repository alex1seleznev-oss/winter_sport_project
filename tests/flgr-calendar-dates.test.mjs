import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseFlgrDateRange,parseFlgrCalendar} from '../scripts/lib/parse-flgr.mjs';
// Minimal reconstructed DOM fixture from the official calendar (not an invented schedule).
// Captured 2026-10-03T14:01:27.265Z, document SHA256:
// 0f78830dd71b7dc015acfb8c3a5341dfc2803c9280cbf99c4fc72af5f52760aa
// Evidence: Actions run 37128168124, artifact 11275995689, flgr-calendar-dom.json.
const official=[['2373','26-29.11.2026','Вершина Тёи','2026-11-26','2026-11-29'],['2366','02-06.12.2026','Тюмень','2026-12-02','2026-12-06'],['2367','09-13.12.2026','Чусовой','2026-12-09','2026-12-13'],['2368','18-20.12.2026','Ижевск','2026-12-18','2026-12-20'],['2369','25-27.12.2026','Чепецкое','2026-12-25','2026-12-27']];
const row=(date,href='/results/2367',name='Этап кубка России')=>`<tr><td>${date}</td><td><a href="${href}">${name}</a></td><td>ЭКР</td></tr>`;
const table=rows=>`<table>${rows}</table>`;
test('five live compact calendar ranges are recognized with exact official IDs',()=>{
 const parsed=parseFlgrCalendar(table(official.map(([id,date,place])=>row(date,`/results/${id}`,`Этап кубка России ${place}`)).join('')));
 assert.equal(parsed.length,5);
 for(let i=0;i<official.length;i++){const [id,, ,start,end]=official[i];assert.equal(parsed[i].event_id,id);assert.equal(parsed[i].start_date,start);assert.equal(parsed[i].end_date,end);assert.equal(parsed[i].href,`https://flgr-results.ru/results/${id}`);}
});
test('full dates and explicitly shared month/year retain correct boundaries',()=>{
 for(const text of ['09-13.12.2026','09 – 13.12.2026','09.12.2026 — 13.12.2026'])assert.deepEqual(parseFlgrDateRange(text),{start_date:'2026-12-09',end_date:'2026-12-13'});
 assert.deepEqual(parseFlgrDateRange('29.11-02.12.2026'),{start_date:'2026-11-29',end_date:'2026-12-02'});
 assert.deepEqual(parseFlgrDateRange('29.12.2026-02.01.2027'),{start_date:'2026-12-29',end_date:'2027-01-02'});
});
test('invalid dates and reversed or ambiguous cross-year ranges fail closed',()=>{
 assert.throws(()=>parseFlgrDateRange('30-31.02.2026'),/DATE_INVALID/);
 assert.throws(()=>parseFlgrDateRange('13-09.12.2026'),/RANGE_REVERSED/);
 assert.throws(()=>parseFlgrDateRange('29.12-02.01.2027'),/RANGE_REVERSED/);
 for(const value of ['09-13.12','09.12.2026','December 2026'])assert.equal(parseFlgrDateRange(value),null);
});
test('one malformed relevant row cannot silently reduce stage coverage',()=>{
 assert.throws(()=>parseFlgrCalendar(table(row('09-13.12.2026')+row('dates TBD','/results/2368'))),/DATE_CONTRACT_MISMATCH/);
});
test('external or insecure result links never become official stages',()=>{
 for(const href of ['https://evil.test/results/2367','http://flgr-results.ru/results/2367','https://u:p@flgr-results.ru/results/2367'])assert.throws(()=>parseFlgrCalendar(table(row('09-13.12.2026',href))),/SOURCE_INVALID/);
});
test('duplicate stages are deduplicated only when dates agree',()=>{
 assert.equal(parseFlgrCalendar(table(row('09-13.12.2026').repeat(2))).length,1);
 assert.throws(()=>parseFlgrCalendar(table(row('09-13.12.2026')+row('10-13.12.2026'))),/DUPLICATE_CONFLICT/);
});
