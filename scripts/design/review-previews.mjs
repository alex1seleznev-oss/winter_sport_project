import {readFileSync} from 'node:fs';
import sharp from 'sharp';
// Public screenshots only. These small previews let a reviewer inspect the CI render without a local browser.
for(const name of ['chromium-desktop-viewer-home','webkit-mobile-viewer-home','chromium-desktop-viewer-full','webkit-mobile-viewer-full']){
 const bytes=readFileSync('artifacts/screenshots/'+name+'.png');
 const image=await sharp(bytes).resize({width:name.endsWith('-full')?600:1000,withoutEnlargement:true}).webp({quality:72}).toBuffer();
 if(image.length>200000)throw new Error('REVIEW_PREVIEW_BUDGET');
 console.log('WSH_VISUAL_REVIEW:'+JSON.stringify({name,image:image.toString('base64')}));
}
