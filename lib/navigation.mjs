export function activeArea(path){
 if(typeof path!=='string')return '';
 if(path==='/' )return 'home';
 if(path==='/my-season'||path.startsWith('/my-season/'))return 'saved';
 if(path==='/competitions'||path.startsWith('/competitions/'))return 'stages';
 if(path==='/calendar'||path.startsWith('/calendar/')||path==='/race-center'||path.startsWith('/race-center/'))return 'calendar';
 if(path==='/guides'||path.startsWith('/guides/'))return 'guides';
 if(path==='/media'||path.startsWith('/media/'))return 'media';
 if(path==='/sources')return 'sources';if(path==='/changes')return 'changes';if(path==='/data-health'||path==='/data-status')return 'health';return '';
}
export function publicEntityPath(kind,id){if(!['stage','race'].includes(kind)||!Number.isSafeInteger(id)||id<1||id>=1e15)throw new Error('INVALID_SHARE_ENTITY');return kind==='stage'?`/competitions/${id}`:`/race-center/${id}`}
