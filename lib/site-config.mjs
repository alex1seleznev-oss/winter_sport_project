import {isIP} from 'node:net';

export function productionOrigin(value){
 if(typeof value!=='string'||!value.trim())return null;
 try{
  const u=new URL(value.trim()),host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)return null;
  if(isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||host.endsWith('.')||/\.(local|internal|localhost)$/.test(host))return null;
  if(!host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return null;
  return u.origin;
 }catch{return null;}
}
export function siteConfiguration(env={}){
 const explicit=env.SITE_URL?.trim();
 const origin=productionOrigin(explicit||(env.VERCEL_PROJECT_PRODUCTION_URL?`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`:''));
 const canIndex=!!origin&&env.NODE_ENV==='production'&&env.VERCEL_ENV!=='preview';
 const verification={};
 if(/^[a-zA-Z0-9_-]{10,256}$/.test(env.GOOGLE_SITE_VERIFICATION||''))verification.google=env.GOOGLE_SITE_VERIFICATION;
 if(/^[a-f0-9]{16}$/i.test(env.YANDEX_SITE_VERIFICATION||''))verification.yandex=env.YANDEX_SITE_VERIFICATION;
 return {origin,canIndex,verification};
}
