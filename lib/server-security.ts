import {timingSafeEqual} from 'node:crypto';
export function validBearer(header:string|null,secret:string):boolean {
 if(!header || !header.startsWith('Bearer ') || secret.length<32)return false;
 const received=Buffer.from(header.slice(7)),expected=Buffer.from(secret);
 return received.length===expected.length && timingSafeEqual(received,expected);
}
export async function boundedJson(request:Request,maxBytes=8192):Promise<unknown>{
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new Error('CONTENT_TYPE');
 if(!request.body)throw new Error('EMPTY_BODY');
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw new Error('BODY_TOO_LARGE')}chunks.push(value)}}finally{reader.releaseLock()}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
