import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const edge=readFileSync('supabase/functions/official-story-intake/index.ts','utf8');
const workflow=readFileSync('.github/workflows/official-story-intake.yml','utf8');

test('official story edge pins the GitHub OIDC trust boundary and Datacenter scope',()=>{
  assert.match(edge,/winter-sports-official-story-intake/);
  assert.match(edge,/refs\/heads\/main/);
  assert.match(edge,/official-story-intake\.yml@refs\/heads\/main/);
  assert.match(edge,/token\.actions\.githubusercontent\.com/);
  assert.match(edge,/SOURCE_SCOPE_DENIED/);
  assert.match(edge,/biathlonresults\.com/);
  assert.match(edge,/modules\/sportapi\/api\/Events/);
  assert.match(edge,/SeasonId/);
  assert.match(edge,/Level/);
  assert.match(edge,/publisherEnqueued!==false/);
});

test('official story workflow has no stored secret dependency and only requests OIDC',()=>{
  assert.match(workflow,/id-token:\s*write/);
  assert.doesNotMatch(workflow,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workflow,/secrets\./);
  assert.match(workflow,/node scripts\/agents\/upload-official-story\.mjs/);
  assert.match(workflow,/push:[\s\S]*branches:\s*\[main\]/);
});
