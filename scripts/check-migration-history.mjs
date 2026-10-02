import {readFileSync,mkdirSync,writeFileSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';
const root=new URL('../database/history/',import.meta.url);const m=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const rows=m.migrations.map(([version,name,expected])=>{const file=`${version}_${name}.sql`;const content=readFileSync(new URL(file,root));const md5=createHash('md5').update(content).digest('hex');return {version,name,md5,expected,match:md5===expected,sha256:createHash('sha256').update(content).digest('hex'),bytes:content.length}});
if(readdirSync(root).filter(f=>f.endsWith('.sql')).length!==rows.length)throw new Error('HISTORY_FILE_COUNT_MISMATCH');
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/migration-history.json',JSON.stringify({project:m.project,exactMatch:rows.every(r=>r.match),rows},null,2));
console.log(JSON.stringify({count:rows.length,exactMatch:rows.every(r=>r.match),mismatches:rows.filter(r=>!r.match)},null,2));if(rows.some(r=>!r.match))process.exitCode=1;
