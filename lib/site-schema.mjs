export function websiteSchema(origin){
  if(!origin)return null;
  const url=new URL(origin);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.port)throw new Error('WEBSITE_ORIGIN_INVALID');
  return {'@context':'https://schema.org','@type':'WebSite','@id':url.origin+'/#website',url:url.origin+'/',name:'Winter Sports Hub',inLanguage:'ru',description:'Календарь биатлона и лыжных гонок, программы этапов и проверенные материалы.'};
}
export function serializeSchema(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
