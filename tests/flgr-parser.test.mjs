import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseFlgrCalendar,parseFlgrCompetition} from '../scripts/lib/parse-flgr.mjs';
const calendar=`<table><tr><td>25.12.2026–27.12.2026</td><td><a href="/results/2369">V Этап кубка России ЭКР с/п Чепецкое</a></td></tr></table>`;
test('calendar parser extracts official Russian Cup stage',()=>{const r=parseFlgrCalendar(calendar);assert.equal(r[0].event_id,'2369');assert.equal(r[0].start_date,'2026-12-25');assert.equal(r[0].end_date,'2026-12-27')});
const detail=`<html><h1>V Этап кубка России</h1><table>
<tr><td>26.12.2026</td><td>9860</td><td>Спринт, свободный стиль, квалификация</td><td>женщины</td><td>Отмена</td></tr>
<tr><td>27.12.2026</td><td>9864</td><td>Скиатлон 20 км</td><td>женщины</td></tr>
<tr><td>27.12.2026</td><td>9900</td><td>Чистое время</td><td>мужчины</td></tr>
</table></html>`;
test('competition parser keeps cancellation and excludes derivative rows from race count',()=>{const p=parseFlgrCompetition(detail,{sourceUrl:'https://www.flgr-results.ru/results/2369'});assert.equal(p.metadata.eventId,'2369');assert.equal(p.counts.competition,2);assert.equal(p.counts.cancelled,1);assert.equal(p.competitionRows[0].status,'cancelled');assert.equal(p.rows[2].derived,true)});
test('competition parser captures official change notes',()=>{const p=parseFlgrCompetition('<table><tr><td>05.12.2026</td><td>9834</td><td>10 км свободный стиль</td><td>женщины</td><td>Перенесено с 03.12.2026.</td></tr></table>');assert.match(p.rows[0].change_note,/Перенесено/)});
test('unrelated documents fail closed',()=>{assert.throws(()=>parseFlgrCalendar('<h1>Access denied</h1>'),/CALENDAR_CONTRACT/);assert.throws(()=>parseFlgrCompetition('<h1>Empty</h1>'),/COMPETITION_CONTRACT/)});
