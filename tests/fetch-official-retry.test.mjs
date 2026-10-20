import test from 'node:test';import assert from 'node:assert/strict';
import {fetchOfficialWithRetry} from '../scripts/lib/fetch-official-retry.mjs';
test('an empty official response is retried once and fresh provenance is retained',async()=>{
 let calls=0;
 const result=await fetchOfficialWithRetry('https://www.fis-ski.com/',{read:async()=>{calls++;if(calls===1)throw new Error('SOURCE_EMPTY_BODY');return {html:'fresh',documentSha256:'fresh-hash'}}});
 assert.equal(calls,2);assert.equal(result.readAttempts,2);assert.equal(result.documentSha256,'fresh-hash');
});
test('transient socket interruption retries once, then still fails closed',async()=>{
 let calls=0;const error=Object.assign(new Error('socket closed'),{code:'ECONNRESET'});
 await assert.rejects(fetchOfficialWithRetry('https://www.fis-ski.com/',{read:async()=>{calls++;throw error}}),error);
 assert.equal(calls,2);
});
test('HTTP denial, TLS, redirects and invalid documents do not retry',async()=>{
 for(const message of ['SOURCE_HTTP_403','SOURCE_HTTP_302','SOURCE_TOO_LARGE','SOURCE_CONTENT_TYPE_INVALID']){
  let calls=0;await assert.rejects(fetchOfficialWithRetry('https://www.fis-ski.com/',{read:async()=>{calls++;throw new Error(message)}}),new RegExp(message));assert.equal(calls,1);
 }
 let calls=0;const tls=Object.assign(new Error('TLS failure'),{code:'CERT_HAS_EXPIRED'});
 await assert.rejects(fetchOfficialWithRetry('https://www.fis-ski.com/',{read:async()=>{calls++;throw tls}}),tls);assert.equal(calls,1);
});
