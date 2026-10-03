import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseFisEventDetail,checkFisEventDetailUrl,summarizeFisSessions} from '../scripts/lib/parse-fis-event-detail.mjs';

const sourceUrl='https://www.fis-ski.com/DB/general/event-details.html?eventid=63002&seasoncode=2027&sectorcode=CC';
function row({date='2026-11-28',codex='0003',raceId='52087',event='1.2km Sprint Qualification Classic',category='WC',gender='M',localTime='',timezone='Europe/Helsinki',cancelled=false}={}){
 const href='https://www.fis-ski.com/DB/general/results.html?sectorcode=CC&amp;raceid='+raceId;
 return '<div class="table-row"><a href="'+href+'"><span class="status__item" title="'+(cancelled?'Cancelled':'Not cancelled')+'">C</span></a><a href="'+href+'"><div class="timezone-date" data-date="'+date+'" data-time="'+localTime+'" data-timezone="'+timezone+'">28 Nov</div></a><a href="'+href+'">'+codex+'</a><a href="'+href+'"><div class="clip">'+event+'</div></a><a href="'+href+'"><div class="clip">'+event+'</div><div class="gender__item">'+gender+'</div></a><a href="'+href+'">'+category+'</a><a href="'+href+'"><div class="gender__item">'+gender+'</div></a><div>TCM: 27.11.2026, 18:00 (LOC)</div></div>';
}
function document(rows=row(),{series='FIS Cross-Country World Cup',eventId=63002,seasonCode=2027,venue='Ruka (FIN)'}={}){
 return '<html><head><script>window.fisProperties = '+JSON.stringify({pageSubtype:'event-details',eventId,seasonCode,disciplineCode:'CC'})+';</script></head><body><h1>'+venue+'</h1><header class="section__header"><h3>'+series+'</h3></header><div id="eventdetailscontent">'+rows+'</div></body></html>';
}
const parse=html=>parseFisEventDetail(html,{sourceUrl});
test('DOM identities preserve codex zeros, race ID, actual date and separate sprint phases',()=>{
 const p=parse(document(row()+row({codex:'0004',raceId:'52088',event:'1.2km Sprint Final Classic'})));
 assert.equal(p.rows.length,2);assert.equal(p.rows[0].codex,'0003');assert.equal(p.rows[0].raceId,'52087');assert.equal(p.rows[0].date,'2026-11-28');
 assert.equal(summarizeFisSessions(p).qualification,1);assert.equal(summarizeFisSessions(p).finals,1);
});
test('empty published clock stays null; team captain meeting is never a race time',()=>assert.equal(parse(document()).rows[0].localTime,null));
test('stage World Cup accepts SWC without pretending it is a normal WC row',()=>{
 const p=parse(document(row({category:'SWC'}),{series:'Cross-Country Stage World Cup'}));assert.equal(p.rows[0].category,'SWC');
 assert.throws(()=>parse(document(row(),{series:'Cross-Country Stage World Cup'})),/CATEGORY_CONTRACT/);
});
test('both team sprint phases remain distinct and mixed relay gender stays mixed',()=>{
 const p=parse(document(row({event:'1.4km Team Sprint Qualification Free'})+row({codex:'0004',raceId:'52088',event:'1.4km Team Sprint Free',gender:'W'})+row({codex:'0005',raceId:'52089',event:'4x5km Relay Classic/Free',gender:'A'})));
 assert.equal(summarizeFisSessions(p).qualification,1);assert.equal(summarizeFisSessions(p).finals,1);assert.equal(p.rows[2].gender,'mixed');
});
test('wrong event, historical season, sport and unexpected venue are rejected',()=>{
 for(const html of [document(row(),{eventId:63003}),document(row(),{seasonCode:2026}),document().replace('"CC"','"AL"')])assert.throws(()=>parse(html),/IDENTITY/);
 assert.throws(()=>parseFisEventDetail(document(),{sourceUrl,expected:{venue:'Davos',country:'SUI'}}),/IDENTITY/);
});
test('invalid dates and dates outside the stated season cannot be inferred or corrected',()=>{
 for(const date of ['2027-02-29','2026-11-31','2025-11-28','2027-07-01','27 Nov'])assert.throws(()=>parse(document(row({date}))),/DATE_CONTRACT/);
});
test('stage date windows are verified against the source date',()=>assert.throws(()=>parseFisEventDetail(document(),{sourceUrl,expected:{startDate:'2026-11-29',endDate:'2026-11-30'}}),/DATE_CONTRACT/));
test('missing or extra malformed rows fail the entire document instead of a partial successful parse',()=>{
 for(const body of ['',row()+'<div class="table-row">unrecognized new record</div>',row().replace('timezone-date','broken')])assert.throws(()=>parse(document(body)),/CONTRACT/);
});
test('responsive labels and genders must agree',()=>{
 assert.throws(()=>parse(document().replace('Sprint Qualification Classic</div><div class="gender', 'Sprint Final Classic</div><div class="gender')),/LABEL_CONTRACT/);
 assert.throws(()=>parse(document().replace('<div class="gender__item">M</div>','<div class="gender__item">W</div>')),/GENDER_CONTRACT/);
});
test('duplicate codex or race ID is never silently merged',()=>{
 assert.throws(()=>parse(document(row()+row({raceId:'52088'}))),/DUPLICATE_IDENTITY/);
 assert.throws(()=>parse(document(row()+row({codex:'0004'}))),/DUPLICATE_IDENTITY/);
});
test('conflicting row result links are rejected',()=>assert.throws(()=>parse(document().replace('raceid=52087','raceid=52088')),/RACE_IDENTITY/));
test('only canonical HTTPS source identities are accepted',()=>{
 for(const u of [sourceUrl.replace('https:','http:'),sourceUrl.replace('www.fis-ski.com','user@www.fis-ski.com'),sourceUrl.replace('www.fis-ski.com','attacker.example'),sourceUrl+'#fragment',sourceUrl+'&eventid=63002',sourceUrl+'&other=1',sourceUrl.replace('sectorcode=CC','sectorcode=AL')])assert.throws(()=>checkFisEventDetailUrl(u),/SOURCE_/);
});
test('unknown format, timezone, clock and cancellation state do not produce publishable data',()=>{
 assert.throws(()=>parse(document(row({event:'Unknown Race'}))),/LABEL_CONTRACT/);
 assert.throws(()=>parse(document(row({timezone:'Invalid/Timezone'}))),/TIMEZONE_CONTRACT/);
 assert.throws(()=>parse(document(row({localTime:'25:00'}))),/TIME_CONTRACT/);
 assert.throws(()=>parse(document().replace('Not cancelled','Unclear')),/STATUS_CONTRACT/);
});
test('explicit cancellation and valid local clock are retained as source facts',()=>{
 const p=parse(document(row({localTime:'12:30',cancelled:true})));assert.equal(p.rows[0].localTime,'12:30');assert.equal(p.rows[0].sourceTimezone,'Europe/Helsinki');assert.equal(p.rows[0].cancelled,true);
});
