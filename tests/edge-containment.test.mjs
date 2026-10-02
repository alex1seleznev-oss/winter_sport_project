import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
for(const name of ['sync-official-sources','sync-public-context','sync-weather'])test(`${name}: paused handler makes no writes or external calls`,async()=>{
 const source=readFileSync(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url),'utf8');
 let handler;let fetches=0;
 const context={Deno:{serve:fn=>{handler=fn}},Response,Request,fetch:()=>{fetches++;throw new Error('Unexpected external request')}};
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 vm.runInNewContext(compiled,context,{timeout:1000});assert.equal(typeof handler,'function');
 const response=await handler(new Request('https://example.test/',{method:'POST',headers:{authorization:'Bearer test'}}));
 assert.equal(response.status,503);const result=await response.json();assert.equal(result.mode,'paused_no_writes');assert.equal(result.ok,false);assert.equal(fetches,0);
 assert.equal((await handler(new Request('https://example.test/'))).status,405);
});
