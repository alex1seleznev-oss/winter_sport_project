import {fetchOfficialHtml,describeSourceError} from './fetch-official.mjs';

// A single fresh read for a transient empty 200 body or transport interruption.
// HTTP denials, certificates, redirects, document limits and parser errors never retry.
export async function fetchOfficialWithRetry(url,{read=fetchOfficialHtml,...options}={}){
  try{return await read(url,options)}
  catch(error){
    if(error?.message!=='SOURCE_EMPTY_BODY'&&describeSourceError(error).category!=='transport')throw error;
    const result=await read(url,options);
    return {...result,readAttempts:2};
  }
}
