import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const source=JSON.parse(readFileSync('content/visual/viewer-cover-source.json','utf8'));
const expected='https://upload.wikimedia.org/wikipedia/commons/b/b2/Sentier_des_Cr%C3%AAtes_enneig%C3%A9_%C3%A0_La_Rosi%C3%A8re_%28d%C3%A9cembre_2025%29.JPG';
if(source.originalUrl!==expected||source.sourceSha1!=='dcfee43ee48023bb0ea46bfb258cec79281f3bd3'||source.license!=='CC BY-SA 4.0')throw new Error('COVER_SOURCE_CONTRACT');
const response=await fetch(expected,{redirect:'error',signal:AbortSignal.timeout(30000),headers:{'user-agent':'WinterSportsHub/2.0 (licensed editorial landscape; github.com/alex1seleznev-oss/winter_sport_project)'}});
if(!response.ok||!response.headers.get('content-type')?.startsWith('image/jpeg')||!response.body)throw new Error('COVER_FETCH_'+response.status);
const chunks=[];let bytes=0;const reader=response.body.getReader();
try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>6*1024*1024){await reader.cancel();throw new Error('COVER_SIZE_LIMIT')}chunks.push(value)}}finally{reader.releaseLock()}
const original=Buffer.concat(chunks),hash=algorithm=>createHash(algorithm).update(original).digest('hex');
if(hash('sha1')!==source.sourceSha1)throw new Error('COVER_ORIGINAL_HASH');
const metadata=await sharp(original,{limitInputPixels:30000000}).metadata();
if(metadata.width!==source.originalWidth||metadata.height!==source.originalHeight)throw new Error('COVER_DIMENSIONS');
mkdirSync('public/home',{recursive:true});const variants=[];
for(const width of [720,1280,1920]){
 const {data,info}=await sharp(original,{limitInputPixels:30000000}).rotate().resize({width,height:width*9/16,fit:'cover',position:'centre',withoutEnlargement:true}).webp({quality:84,effort:6}).toBuffer({resolveWithObject:true});
 if(data.length>500000)throw new Error('COVER_VARIANT_BUDGET');
 const src='/home/winter-landscape-'+width+'.webp';writeFileSync('public'+src,data);
 variants.push({src,width:info.width,height:info.height,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
writeFileSync('content/visual/viewer-cover.json',JSON.stringify({...source,sourceSha256:hash('sha256'),variants},null,2)+'\n');
console.log(JSON.stringify({images:1,variants:variants.length,bytes:variants.reduce((sum,v)=>sum+v.bytes,0),sourceSha256:hash('sha256')}));
