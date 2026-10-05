const stringSchema={type:'string'};
const boolSchema={type:'boolean'};
const sourceKind={type:'string',enum:['official','organizer','secondary','community','social']};
const confidence={type:'string',enum:['unknown','low','medium','high','verified']};
const sourceRefArray={type:'array',items:stringSchema};
const evidenceText={type:'string',minLength:1,maxLength:12000};

const evidenceSource={
 type:'object',additionalProperties:false,
 properties:{sourceId:stringSchema,kind:sourceKind,url:stringSchema,publishedAt:{anyOf:[{type:'string',format:'date-time'},{type:'null'}]},observedAt:{type:'string',format:'date-time'},evidence:evidenceText},
 required:['sourceId','kind','url','publishedAt','observedAt','evidence']
};
const claim={
 type:'object',additionalProperties:false,
 properties:{claimId:stringSchema,text:stringSchema,kind:{type:'string',enum:['fact','analysis','uncertainty']},confidence,sourceIds:{type:'array',items:stringSchema},mutable:boolSchema},
 required:['claimId','text','kind','confidence','sourceIds','mutable']
};
const conflict={
 type:'object',additionalProperties:false,
 properties:{claimId:stringSchema,note:stringSchema},required:['claimId','note']
};
export const evidencePacketSchema={
 type:'object',additionalProperties:false,
 properties:{packetId:stringSchema,topic:stringSchema,createdAt:{type:'string',format:'date-time'},sources:{type:'array',items:evidenceSource},claims:{type:'array',items:claim},conflicts:{type:'array',items:conflict}},
 required:['packetId','topic','createdAt','sources','claims','conflicts']
};

const factCheck={
 type:'object',additionalProperties:false,
 properties:{claimId:stringSchema,decision:{type:'string',enum:['supported','conflicted','unsupported','stale','not_applicable']},sourceRefs:sourceRefArray,note:stringSchema},
 required:['claimId','decision','sourceRefs','note']
};
export const factCheckReportSchema={
 type:'object',additionalProperties:false,
 properties:{reportId:stringSchema,packetId:stringSchema,decision:{type:'string',enum:['pass','block','review_required']},checks:{type:'array',items:factCheck}},
 required:['reportId','packetId','decision','checks']
};
export const approvedEvidenceSchema={
 type:'object',additionalProperties:false,
 properties:{packet:evidencePacketSchema,report:factCheckReportSchema},required:['packet','report']
};
export const factCheckBundleSchema={
 type:'object',additionalProperties:false,
 properties:{report:factCheckReportSchema,approvedEvidence:{anyOf:[approvedEvidenceSchema,{type:'null'}]}},required:['report','approvedEvidence']
};

export const articleDraftSchema={
 type:'object',additionalProperties:false,
 properties:{
  draftId:stringSchema,title:stringSchema,dek:stringSchema,body:stringSchema,claimIds:{type:'array',items:stringSchema},sourceRefs:sourceRefArray,
  seo:{type:'object',additionalProperties:false,properties:{title:stringSchema,description:stringSchema},required:['title','description']},
  internalLinks:{type:'array',items:stringSchema}
 },
 required:['draftId','title','dek','body','claimIds','sourceRefs','seo','internalLinks']
};

const visualMedia={
 type:'object',additionalProperties:false,
 properties:{mediaRef:stringSchema,identityReviewed:boolSchema,rightsReviewed:boolSchema,credit:stringSchema},
 required:['mediaRef','identityReviewed','rightsReviewed','credit']
};
export const visualPackageSchema={
 type:'object',additionalProperties:false,
 properties:{packageId:stringSchema,draftId:stringSchema,namedPersonMedia:boolSchema,media:{type:'array',items:visualMedia}},
 required:['packageId','draftId','namedPersonMedia','media']
};

export const MODEL_OUTPUT_SCHEMAS=Object.freeze({
 research:{name:'evidence_packet',schema:evidencePacketSchema},
 'fact-check':{name:'fact_check_bundle',schema:factCheckBundleSchema},
 'editorial-writer':{name:'article_draft',schema:articleDraftSchema},
 'visual-director':{name:'visual_package',schema:visualPackageSchema}
});

function schemaTypeOk(value,type){
 if(type==='null')return value===null;
 if(type==='array')return Array.isArray(value);
 if(type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value);
 if(type==='integer')return Number.isInteger(value);
 if(type==='number')return typeof value==='number'&&Number.isFinite(value);
 return typeof value===type;
}

export function assertModelSchema(value,schema,path='modelOutput'){
 if(schema.anyOf){for(const candidate of schema.anyOf){try{assertModelSchema(value,candidate,path);return true}catch{}}throw new Error(`MODEL_SCHEMA_ANYOF_INVALID:${path}`)}
 if(schema.type&&!schemaTypeOk(value,schema.type))throw new Error(`MODEL_SCHEMA_TYPE_INVALID:${path}:${schema.type}`);
 if(schema.enum&&!schema.enum.includes(value))throw new Error(`MODEL_SCHEMA_ENUM_INVALID:${path}`);
 if(schema.type==='string'){
  if(schema.format==='date-time'&&Number.isNaN(Date.parse(value)))throw new Error(`MODEL_SCHEMA_DATETIME_INVALID:${path}`);
  if(Number.isInteger(schema.minLength)&&value.length<schema.minLength)throw new Error(`MODEL_SCHEMA_STRING_TOO_SHORT:${path}`);
  if(Number.isInteger(schema.maxLength)&&value.length>schema.maxLength)throw new Error(`MODEL_SCHEMA_STRING_TOO_LONG:${path}`);
 }
 if(schema.type==='array'){
  if(Number.isInteger(schema.minItems)&&value.length<schema.minItems)throw new Error(`MODEL_SCHEMA_ARRAY_TOO_SHORT:${path}`);
  if(Number.isInteger(schema.maxItems)&&value.length>schema.maxItems)throw new Error(`MODEL_SCHEMA_ARRAY_TOO_LONG:${path}`);
  for(let i=0;i<value.length;i++)assertModelSchema(value[i],schema.items,`${path}[${i}]`);return true
 }
 if(schema.type==='object'){
  const properties=schema.properties??{};for(const key of schema.required??[])if(!(key in value))throw new Error(`MODEL_SCHEMA_REQUIRED_MISSING:${path}.${key}`);
  if(schema.additionalProperties===false)for(const key of Object.keys(value))if(!(key in properties))throw new Error(`MODEL_SCHEMA_ADDITIONAL_PROPERTY:${path}.${key}`);
  for(const [key,child] of Object.entries(properties))if(key in value)assertModelSchema(value[key],child,`${path}.${key}`);
 }
 return true;
}
