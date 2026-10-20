import test from 'node:test';import assert from 'node:assert/strict';
import {websiteSchema,serializeSchema} from '../lib/site-schema.mjs';
test('site identity uses the actual configured origin and does not invent reviews or offers',()=>{
 const data=websiteSchema('https://winter-sport-project.vercel.app');assert.equal(data.url,'https://winter-sport-project.vercel.app/');
 assert.equal(data['@type'],'WebSite');assert.equal(data.name,'Winter Sports Hub');assert.equal(data.inLanguage,'ru');
 assert.equal('aggregateRating' in data,false);assert.equal('offers' in data,false);assert.equal(websiteSchema(null),null);
});
test('schema serialization cannot terminate its script element',()=>{
 const value={name:'</script><script>alert(1)</script>'},serialized=serializeSchema(value);
 assert.equal(serialized.includes('<'),false);assert.deepEqual(JSON.parse(serialized),value);
});
test('a website identity cannot use an unrelated path or insecure URL',()=>{
 for(const value of ['http://example.com','https://example.com/path','https://example.com/?x=1','https://user:pass@example.com/'])assert.throws(()=>websiteSchema(value),/ORIGIN_INVALID/);
});
