import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const upload=readFileSync('scripts/agents/upload-official-story.mjs','utf8');

test('official story uploader rejects privilege-bearing input fields',()=>{
  for(const key of ['sourceFeedId','publicationAllowed','calendarMutationAllowed','agentId'])assert.match(upload,new RegExp(key));
  assert.match(upload,/namedPersonMedia!==false/);
  assert.match(upload,/publisherEnqueued!==false/);
});

test('official story uploader uses short-lived Actions OIDC instead of repository secrets',()=>{
  assert.match(upload,/ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(upload,/ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
  assert.match(upload,/winter-sports-official-story-intake/);
  assert.doesNotMatch(upload,/SUPABASE_SERVICE_ROLE_KEY/);
});

test('official story uploader is pinned to the same IBU Datacenter scope as the intake edge',()=>{
  assert.match(upload,/biathlonresults\.com/);
  assert.match(upload,/\/modules\/sportapi\/api\/Events/);
  assert.match(upload,/SeasonId/);
  assert.match(upload,/2627/);
  assert.match(upload,/Level/);
  assert.match(upload,/'1'/);
  assert.doesNotMatch(upload,/www\.biathlonworld\.com/);
});
