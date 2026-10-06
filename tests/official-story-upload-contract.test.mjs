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
