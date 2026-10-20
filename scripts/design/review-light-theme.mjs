import {readFileSync} from 'node:fs';
import sharp from 'sharp';
for(const project of ['chromium-desktop','webkit-mobile']){
 for(const page of ['calendar','stages','programme','media','article','comparison','saved','credits','platform','archive']){
  const bytes=readFileSync('artifacts/screenshots/'+project+'-light-'+page+'.png');
  const image=await sharp(bytes).resize({width:project==='webkit-mobile'?390:850,withoutEnlargement:true}).webp({quality:72}).toBuffer();
  if(image.length>200000)throw new Error('REVIEW_PREVIEW_BUDGET');
  console.log('WSH_LIGHT_REVIEW:'+JSON.stringify({name:project+'-'+page,image:image.toString('base64')}));
 }
}
