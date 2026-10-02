// Public rendering and research are separate. A source URL or credit alone is not a licence.
export function approvedStagePhoto(asset,key){
 if(!asset||asset.competitionKey!==key||asset.publicationStatus!=='published'||!['owned','licensed','public_domain'].includes(asset.rightsStatus)||asset.identityReview!=='verified'||asset.originalPreserved!==true)return null;
 if(typeof asset.src!=='string'||!/^\/media\/stages\/[a-z0-9-]+\.(?:jpg|jpeg|webp|avif)$/.test(asset.src)||!Number.isSafeInteger(asset.width)||!Number.isSafeInteger(asset.height)||asset.width<1||asset.height<1)return null;
 if(!asset.credit||!asset.licence||!asset.rightsEvidence||!asset.alt||!/^\d{4}-\d{2}-\d{2}$/.test(asset.photoDate))return null;
 try{const u=new URL(asset.sourcePage);if(u.protocol!=='https:'||u.username||u.password)return null}catch{return null}
 return asset;
}
