import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const photos=JSON.parse(readFileSync('content/editorial/photographs.json','utf8'));
test('article image bytes retain auditable provenance, correct subjects and no upscaling',()=>{
  const keys=new Set();
  for(const photo of photos){
    assert.ok(!keys.has(photo.key));keys.add(photo.key);
    assert.ok(photo.archival);
    assert.equal(new URL(photo.sourceUrl).hostname,'commons.wikimedia.org');
    assert.equal(new URL(photo.licenseUrl).hostname,'creativecommons.org');
    assert.match(photo.sourceSha1,/^[a-f0-9]{40}$/);
    assert.match(photo.capturedOn,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(photo.author&&photo.name&&photo.scene);
    for(const v of photo.variants){
      assert.match(v.src,/^\/editorial\/[a-z0-9-]+\.webp$/);
      assert.ok(v.width<=photo.originalWidth);
      const bytes=readFileSync('public'+v.src);
      assert.equal(bytes.length,v.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),v.sha256);
    }
  }
  // This search hit depicts other skiers, despite matching a name query.
  assert.ok(!photos.some(p=>p.key.includes('183432927')));
});
