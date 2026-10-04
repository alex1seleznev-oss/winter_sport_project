const PROFILE_MODEL_ENV=Object.freeze({
 economy:'OPENAI_MODEL_ECONOMY',balanced:'OPENAI_MODEL_BALANCED',expert:'OPENAI_MODEL_EXPERT'
});

export class ModelProviderError extends Error{
 constructor(code,{status=null,retryable=false,cause=null}={}){super(code,{cause});this.name='ModelProviderError';this.code=code;this.status=status;this.retryable=retryable}
}

function textFromResponse(payload){
 const refusals=[];const texts=[];
 for(const item of payload?.output??[]){
  if(item?.type!=='message')continue;
  for(const part of item.content??[]){
   if(part?.type==='output_text'&&typeof part.text==='string')texts.push(part.text);
   if(part?.type==='refusal'&&typeof part.refusal==='string')refusals.push(part.refusal);
  }
 }
 if(refusals.length)throw new ModelProviderError('MODEL_REFUSAL',{retryable:false});
 if(!texts.length)throw new ModelProviderError('MODEL_OUTPUT_MISSING',{retryable:false});
 return texts.join('');
}

export class OpenAIResponsesProvider{
 constructor({apiKey=process.env.OPENAI_API_KEY,models={},endpoint='https://api.openai.com/v1/responses',fetchImpl=globalThis.fetch}={}){
  this.apiKey=apiKey;this.models={...models};this.endpoint=endpoint;this.fetchImpl=fetchImpl;
 }
 modelFor(profile){
  const envName=PROFILE_MODEL_ENV[profile];
  const model=this.models[profile]||(envName?process.env[envName]:undefined)||process.env.OPENAI_MODEL;
  if(!model)throw new ModelProviderError(`MODEL_FOR_PROFILE_NOT_CONFIGURED:${profile}`);
  return model;
 }
 async invoke({modelProfile,instructions,input,schema,maxOutputTokens,signal,metadata={}}){
  if(!this.apiKey)throw new ModelProviderError('MODEL_PROVIDER_NOT_CONFIGURED:OPENAI_API_KEY');
  if(typeof this.fetchImpl!=='function')throw new ModelProviderError('MODEL_PROVIDER_FETCH_UNAVAILABLE');
  const model=this.modelFor(modelProfile);
  const body={
   model,store:false,max_output_tokens:maxOutputTokens,
   input:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],
   text:{format:{type:'json_schema',name:schema.name,strict:true,schema:schema.schema}},
   metadata:Object.fromEntries(Object.entries(metadata).filter(([,v])=>v!==undefined&&v!==null).map(([k,v])=>[k,String(v).slice(0,512)]))
  };
  let response;
  try{response=await this.fetchImpl(this.endpoint,{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal})}
  catch(error){if(error?.name==='AbortError')throw new ModelProviderError('MODEL_REQUEST_TIMEOUT',{retryable:true,cause:error});throw new ModelProviderError('MODEL_REQUEST_NETWORK_ERROR',{retryable:true,cause:error})}
  let payload=null;
  try{payload=await response.json()}catch(error){throw new ModelProviderError('MODEL_RESPONSE_INVALID_JSON',{status:response.status,retryable:response.status>=500,cause:error})}
  if(!response.ok){const retryable=response.status===408||response.status===409||response.status===429||response.status>=500;throw new ModelProviderError(`MODEL_HTTP_${response.status}`,{status:response.status,retryable})}
  if(payload?.status&&payload.status!=='completed')throw new ModelProviderError(`MODEL_RESPONSE_${String(payload.status).toUpperCase()}`,{retryable:payload.status==='incomplete'||payload.status==='failed'});
  const text=textFromResponse(payload);let output;
  try{output=JSON.parse(text)}catch(error){throw new ModelProviderError('MODEL_OUTPUT_INVALID_JSON',{retryable:false,cause:error})}
  return {output,model:payload?.model??model,responseId:payload?.id??null,usage:{inputTokens:payload?.usage?.input_tokens??null,outputTokens:payload?.usage?.output_tokens??null,totalTokens:payload?.usage?.total_tokens??null}};
 }
}
