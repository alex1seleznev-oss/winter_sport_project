import {readFileSync} from 'node:fs';
import sharp from 'sharp';
// Public screenshots only; bound thumbnails independently of device scale and page height.
for(const name of ['chromium-desktop-viewer-home','webkit-mobile-viewer-home','chromium-desktop-viewer-full','webkit-mobile-viewer-full']){
 const bytes=readFileSync('artifacts/screenshots/'+name+'.png'),full=name.endsWith('-full');
 let image=await sharp(bytes).resize({width:full?(name.startsWith('webkit')?320:600):800,withoutEnlargement:true}).webp({quality:72}).toBuffer();
 if(image.length>200000)image=await sharp(bytes).resize({width:240,withoutEnlargement:true}).webp({quality:65}).toBuffer();
 if(image.length>200000)throw new Error('REVIEW_PREVIEW_BUDGET');
 console.log('WSH_VISUAL_REVIEW:'+JSON.stringify({name,image:image.toString('base64')}));
}
