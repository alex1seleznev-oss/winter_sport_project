import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchIbuDatacenterEvents,assertIbuEventsApiUrl,IBU_EVENTS_API_URL} from '../scripts/lib/fetch-ibu-datacenter.mjs';

function response(body,{status=200,contentType='application/json'}={}){
  return new Response(body,{status,headers:{'content-type':contentType}});
}

test('IBU API URL is pinned to the 2026/27 World Cup event list',()=>{
  assert.equal(assertIbuEventsApiUrl(IBU_EVENTS_API_URL).hostname,'biathlonresults.com');
  assert.throws(()=>assertIbuEventsApiUrl('https://example.com/modules/sportapi/api/Events?SeasonId=2627&Level=1'),/IBU_API_URL_NOT_ALLOWED/);
  assert.throws(()=>assertIbuEventsApiUrl('https://biathlonresults.com/modules/sportapi/api/Events?SeasonId=2526&Level=1'),/IBU_API_SCOPE_DENIED/);
  assert.throws(()=>assertIbuEventsApiUrl('https://biathlonresults.com/modules/sportapi/api/Events?SeasonId=2627&Level=2'),/IBU_API_SCOPE_DENIED/);
  assert.throws(()=>assertIbuEventsApiUrl('https://biathlonresults.com/modules/sportapi/api/Events?SeasonId=2627&Level=1&x=1'),/IBU_API_SCOPE_DENIED/);
});

test('IBU API fetch accepts bounded JSON and records a receipt',async()=>{
  const seen=[];
  const fetchImpl=async(url,options)=>{seen.push({url:url.toString(),options});return response(JSON.stringify([{EventId:'BT2627SWRLCP01'}]));};
  const out=await fetchIbuDatacenterEvents(IBU_EVENTS_API_URL,{fetchImpl});
  assert.equal(out.data[0].EventId,'BT2627SWRLCP01');
  assert.equal(out.httpStatus,200);
  assert.equal(out.tlsVerified,true);
  assert.match(out.documentSha256,/^[a-f0-9]{64}$/);
  assert.equal(seen[0].options.redirect,'manual');
});

test('IBU API fetch fails closed on HTTP, content type, shape and oversized bodies',async()=>{
  await assert.rejects(()=>fetchIbuDatacenterEvents(IBU_EVENTS_API_URL,{fetchImpl:async()=>response('[]',{status:503})}),/IBU_API_HTTP_503/);
  await assert.rejects(()=>fetchIbuDatacenterEvents(IBU_EVENTS_API_URL,{fetchImpl:async()=>response('<html/>',{contentType:'text/html'})}),/IBU_API_CONTENT_TYPE_INVALID/);
  await assert.rejects(()=>fetchIbuDatacenterEvents(IBU_EVENTS_API_URL,{fetchImpl:async()=>response('{}')}),/IBU_API_SHAPE_INVALID/);
  await assert.rejects(()=>fetchIbuDatacenterEvents(IBU_EVENTS_API_URL,{fetchImpl:async()=>response(JSON.stringify([{x:'a'.repeat(256)}])),maxBytes:20}),/IBU_API_TOO_LARGE/);
});
