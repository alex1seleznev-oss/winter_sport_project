import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRuntimeSchema} from '../lib/agents/model-runtime.mjs';
import {assertModelSchema} from '../lib/agents/model-schemas.mjs';

const packet={
 packetId:'packet-1',topic:'Synthetic chain test',createdAt:'2026-10-05T12:00:00Z',
 sources:[
  {sourceId:'source:official:1',kind:'official',url:'https://example.org/official',publishedAt:null,observedAt:'2026-10-05T12:00:00Z',evidence:'Official source evidence A.'},
  {sourceId:'source:secondary:2',kind:'secondary',url:'https://example.org/secondary',publishedAt:null,observedAt:'2026-10-05T12:00:00Z',evidence:'Secondary source evidence B.'}
 ],
 claims:[
  {claimId:'claim-a',text:'A',kind:'fact',confidence:'verified',sourceIds:['source:official:1'],mutable:false},
  {claimId:'claim-b',text:'B',kind:'uncertainty',confidence:'medium',sourceIds:['source:secondary:2'],mutable:true}
 ],
 conflicts:[]
};

const approved={
 packet,
 report:{
  reportId:'report-1',packetId:'packet-1',decision:'pass',
  checks:[
   {claimId:'claim-a',decision:'supported',sourceRefs:['source:official:1'],note:'ok'},
   {claimId:'claim-b',decision:'supported',sourceRefs:['https://example.org/secondary'],note:'ok'}
  ]
 }
};

test('fact-check structured output is constrained to exact packet claim and non-empty source refs',()=>{
 const runtime=buildRuntimeSchema('fact-check',{jobId:'job-fact'},[{type:'evidence-packet',value:packet}]);
 const report=runtime.schema.properties.report;
 assert.deepEqual(report.properties.packetId.enum,['packet-1']);
 assert.deepEqual(report.properties.checks.items.properties.claimId.enum,['claim-a','claim-b']);
 assert.deepEqual(report.properties.checks.items.properties.sourceRefs.items.enum,[
  'source:official:1','https://example.org/official','source:secondary:2','https://example.org/secondary'
 ]);
 assert.equal(report.properties.checks.items.properties.sourceRefs.minItems,1);
 const approvedSchema=runtime.schema.properties.approvedEvidence.anyOf.find(candidate=>candidate.type==='object');
 assert.deepEqual(approvedSchema.properties.packet.properties.packetId.enum,['packet-1']);
 assert.deepEqual(approvedSchema.properties.packet.properties.sources.items.properties.evidence.enum,['Official source evidence A.','Secondary source evidence B.']);
 assert.deepEqual(approvedSchema.properties.report.properties.checks.items.properties.claimId.enum,['claim-a','claim-b']);
 assert.equal(approvedSchema.properties.report.properties.checks.items.properties.sourceRefs.minItems,1);
 const emptyRefOutput={
  report:{reportId:'report-x',packetId:'packet-1',decision:'pass',checks:[
   {claimId:'claim-a',decision:'supported',sourceRefs:[],note:'missing evidence ref'},
   {claimId:'claim-b',decision:'supported',sourceRefs:['source:secondary:2'],note:'ok'}
  ]},
  approvedEvidence:null
 };
 assert.throws(()=>assertModelSchema(emptyRefOutput,runtime.schema),/MODEL_SCHEMA_ARRAY_TOO_SHORT/);
});

test('editorial structured output is constrained to approved claim and source refs',()=>{
 const runtime=buildRuntimeSchema('editorial-writer',{jobId:'job-writer'},[{type:'approved-evidence',value:approved}]);
 assert.deepEqual(runtime.schema.properties.claimIds.items.enum,['claim-a','claim-b']);
 assert.deepEqual(runtime.schema.properties.sourceRefs.items.enum,[
  'source:official:1','https://example.org/official','source:secondary:2','https://example.org/secondary'
 ]);
});

test('research schema constrains source URLs and evidence to supplied material',()=>{
 const evidence='Supplied evidence text.';
 const runtime=buildRuntimeSchema('research',{sourceRefs:['https://example.org/a'],payload:{sourceEvidence:[{url:'https://example.org/a',evidence}]}},[
  {type:'source-snapshot',value:{sourceUrl:'https://example.org/b'}}
 ]);
 assert.deepEqual(runtime.schema.properties.sources.items.properties.url.enum,['https://example.org/a','https://example.org/b']);
 assert.deepEqual(runtime.schema.properties.sources.items.properties.evidence.enum,[evidence]);
 assert.ok(runtime.schema.properties.sources.items.required.includes('evidence'));
});

test('bounded source evidence schema rejects empty and oversized strings',()=>{
 const schema=buildRuntimeSchema('research',{sourceRefs:['https://example.org/a'],payload:{sourceEvidence:[{url:'https://example.org/a',evidence:'ok'}]}},[]).schema;
 const base={packetId:'p',topic:'t',createdAt:'2026-10-05T12:00:00Z',sources:[{sourceId:'s',kind:'official',url:'https://example.org/a',publishedAt:null,observedAt:'2026-10-05T12:00:00Z',evidence:'ok'}],claims:[],conflicts:[]};
 assert.throws(()=>assertModelSchema({...base,sources:[{...base.sources[0],evidence:''}]},schema),/MODEL_SCHEMA_ENUM_INVALID|MODEL_SCHEMA_STRING_TOO_SHORT/);
 assert.throws(()=>assertModelSchema({...base,sources:[{...base.sources[0],evidence:'x'.repeat(12001)}]},schema),/MODEL_SCHEMA_ENUM_INVALID|MODEL_SCHEMA_STRING_TOO_LONG/);
});
