import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {intakeBatches} from '../scripts/media-watch/intake-batches.mjs';

const runner=fileURLToPath(new URL('../scripts/media-watch/run.mjs',import.meta.url));
// Run the actual collector with deterministic public responses, never live sites.
const mockFetch=`
globalThis.fetch=async url=>{
 const u=new URL(url),mode=process.env.MEDIA_WATCH_TEST_MODE;
 if(mode==='all-timeout'||(u.hostname==='skisport.ru'&&mode==='partial-timeout'))
  throw new DOMException('Synthetic timeout','TimeoutError');
 if(u.hostname==='skisport.ru'&&mode==='http-error')return new Response('',{status:403});
 let body,type='text/html';
 if(u.hostname==='t.me'){
  const handle=u.pathname.split('/').at(-1);
  body='<div class="tgme_widget_message" data-post="'+handle+'/1"><div class="tgme_widget_message_text">Синтетическая новость о лыжных гонках</div><a class="tgme_widget_message_date"><time datetime="'+new Date(Date.now()-86400000).toISOString().slice(0,10)+'T00:00:00Z"></time></a></div>';
 }else if(u.pathname.endsWith('.xml')){
  type='application/rss+xml';
  body='<rss><channel><item><title>Синтетическая лыжная гонка</title><link>https://www.sports.ru/skiing/123.html</link></item></channel></rss>';
 }else if(u.hostname==='skisport.ru'){
  body=mode==='parser-error'?'<title>Unexpected login page</title>':'<title>Лыжный Спорт</title><a href="/news/cross-country/123/">Синтетическая новость о лыжных гонках</a>';
 }else{
  body='<title>Sports.ru</title><a href="'+u.pathname+'123.html">Синтетическая новость о лыжных гонках</a>';
 }
 return new Response(body,{headers:{'content-type':type}});
};
`;

function collect(mode){
 const dir=mkdtempSync(join(tmpdir(),'public-media-watch-'));
 try{
  const preload=join(dir,'mock-fetch.mjs');writeFileSync(preload,mockFetch);
  const result=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,runner],{
   cwd:dir,env:{...process.env,MEDIA_WATCH_TEST_MODE:mode},encoding:'utf8',timeout:20000,
  });
  assert.ifError(result.error);
  const read=name=>JSON.parse(readFileSync(join(dir,'artifacts/media-watch',name),'utf8'));
  return {...result,packet:read('packet.json'),health:read('health.json')};
 }finally{rmSync(dir,{recursive:true,force:true});}
}

test('one source timeout leaves eight healthy sources eligible for validated intake',()=>{
 const result=collect('partial-timeout');
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.health.totals.parsedSources,8);
 assert.equal(result.health.totals.failedSources,1);
 const failed=result.packet.sources.find(s=>s.key==='skisport');
 assert.equal(failed.status,'error');assert.equal(failed.error,'TIMEOUT');
 assert.match(result.stderr,/::warning::.*skisport.*incomplete/);
 const items=intakeBatches(result.packet).flat();
 assert.equal(items.length,8);
 assert.ok(items.every(i=>i.sourceKey!=='skisport'));
 assert.equal(result.packet.databaseWrites,0);
 assert.equal(result.packet.publishedFacts,0);
});

test('timeouts on every source still fail collection',()=>{
 const result=collect('all-timeout');
 assert.equal(result.status,1);
 assert.equal(result.health.totals.parsedSources,0);
 assert.equal(result.health.totals.failedSources,9);
 assert.deepEqual(result.packet.items,[]);
});

for(const mode of ['parser-error','http-error'])test(`${mode} still blocks intake despite healthy sources`,()=>{
 const result=collect(mode);
 assert.equal(result.status,1);
 assert.equal(result.health.totals.parsedSources,8);
 assert.equal(result.packet.sources.find(s=>s.key==='skisport').error,mode==='parser-error'?'PUBLISHER_IDENTITY':'HTTP_403');
});
