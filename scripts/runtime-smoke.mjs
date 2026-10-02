// Real HTTP checks of the production build. No privileged credentials, writes or browser automation.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='http://127.0.0.1:4173';
const checks=[]; let child; let log='';
async function start(secret=''){
 child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4173'],{env:{...process.env,NODE_ENV:'production',VERCEL_ENV:'preview',CRON_SECRET:secret,MEDIA_UPLOADS_ENABLED:'false',MEDIA_LEGAL_REVIEW_APPROVED:'false'},stdio:['ignore','pipe','pipe']});
 for(const pipe of [child.stdout,child.stderr])pipe.on('data',b=>{log=(log+b.toString()).slice(-20000)});
 for(let i=0;i<60;i++){
  if(child.exitCode!==null)throw new Error('SERVER_EXITED: '+log);
  try{const response=await fetch(origin+'/legal',{signal:AbortSignal.timeout(1500)});await response.body?.cancel();if(response.status===200)return}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 throw new Error('SERVER_START_TIMEOUT');
}
async function stop(){if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await Promise.race([exited,new Promise(r=>setTimeout(r,5000))]);if(child.exitCode===null)child.kill('SIGKILL')}}
async function check(path,status,validate,init){
 const response=await fetch(origin+path,{...init,redirect:'manual',signal:AbortSignal.timeout(30000)}); const body=await response.text();
 assert.equal(response.status,status,`${path}: unexpected HTTP status`);if(validate)validate(body,response);
 checks.push({path,status,passed:true});
}
try{
 await start('ci-test-only-not-a-production-secret-123456789');
 await check('/legal',200,(body,r)=>{assert.match(body,/Прозрачные ограничения/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('x-frame-options'),'DENY');assert.ok(r.headers.get('content-security-policy')?.includes("object-src 'none'"));assert.ok(!r.headers.get('x-powered-by'))});
 await check('/methodology',200,body=>assert.match(body,/Сначала источник/));
 await check('/calendar',200,body=>{assert.match(body,/name="sport"/);assert.match(body,/href="\/race-center\/[4-9][0-9]*"|href="\/race-center\/[1-9][0-9]+"/);assert.doesNotMatch(body,/href="\/race-center\/[123]"/);assert.match(body,/Время не опубликовано/)});
 await check('/calendar?sport=biathlon',200,body=>assert.match(body,/пока нет опубликованных гонок|Биатлон/));
 await check('/race-center/4',200,body=>{assert.match(body,/Первоисточник|первоисточник/);assert.match(body,/Время не опубликовано/)});
 await check('/race-center/1',404);
 await check('/race-center/99999999999',404);
 await check('/api/sync',401,body=>assert.match(body,/UNAUTHORIZED/));
 await check('/api/sync',401,null,{headers:{authorization:'Bearer invalid'}});
 await check('/api/media/upload-ticket',503,body=>assert.match(body,/MEDIA_UPLOADS_DISABLED/),{method:'POST'});
 await check('/api/source-status',200,body=>{const data=JSON.parse(body);assert.equal(data.ok,true);assert.ok(data.sources.length>=4)});
 await check('/data-health',200,body=>assert.match(body,/Гонки с источником/));
 await check('/platform',200,body=>{assert.match(body,/Помощники с границами/);assert.match(body,/выключен/)});
 await check('/robots.txt',200,body=>assert.match(body,/Disallow: \//));
 await stop(); await start();
 await check('/api/sync',503,body=>assert.match(body,/SOURCE_CHECK_NOT_CONFIGURED/));
 console.log(JSON.stringify({passed:checks.length,checks},null,2));
}catch(error){console.error(error);console.error(log);process.exitCode=1}
finally{await stop();mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/runtime-smoke.json',JSON.stringify({generatedAt:new Date().toISOString(),passed:checks.length,complete:!process.exitCode,checks},null,2))}
