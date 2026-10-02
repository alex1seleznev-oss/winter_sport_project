import {test} from 'node:test';import assert from 'node:assert/strict';
import {fetchOfficialHtml} from '../scripts/lib/fetch-official.mjs';
const source='https://www.fis-ski.com/DB/general/results.html?raceid=1';
test('untrusted host is rejected before a network call',async()=>{let called=false;await assert.rejects(fetchOfficialHtml('https://127.0.0.1/',{fetchImpl:async()=>{called=true}}),/NOT_ALLOWED/);assert.equal(called,false)});
test('redirect is not silently followed',async()=>await assert.rejects(fetchOfficialHtml(source,{fetchImpl:async()=>new Response('',{status:302,headers:{location:'https://attacker.example'}})}),/HTTP_302/));
test('HTTP and content-type failures are distinct',async()=>{await assert.rejects(fetchOfficialHtml(source,{fetchImpl:async()=>new Response('',{status:403})}),/HTTP_403/);await assert.rejects(fetchOfficialHtml(source,{fetchImpl:async()=>new Response('{}',{headers:{'content-type':'application/json'}})}),/CONTENT_TYPE/)});
test('oversized stream is rejected',async()=>await assert.rejects(fetchOfficialHtml(source,{maxBytes:2,fetchImpl:async()=>new Response('abc',{headers:{'content-type':'text/html'}})}),/TOO_LARGE/));
test('successful read records immutable document hash',async()=>{const r=await fetchOfficialHtml(source,{fetchImpl:async()=>new Response('<html></html>',{headers:{'content-type':'text/html'}})});assert.equal(r.bytes,13);assert.match(r.documentSha256,/^[a-f0-9]{64}$/)});
