import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAthleteCandidate, extensionForMime} from '../scripts/visual/athlete-candidate-gate.mjs';

const candidate = (overrides = {}) => ({title: '', categories: '', description: '', mime: 'image/jpeg', ...overrides});

test('accepts Benjamin Moser when skier context is present', () => {
  const result = assessAthleteCandidate(
    {name: 'Benjamin Moser', sport: 'cross_country'},
    candidate({title: '2022 Benjamin Moser (cropped).jpg', categories: 'Benjamin Moser (skier)|2022 Winter Olympics sportspeople from Austria'}),
  );
  assert.equal(result.downloadEligible, true);
});

test('rejects Alexander Loginov hockey namesake', () => {
  const result = assessAthleteCandidate(
    {name: 'Alexander Loginov', sport: 'biathlon'},
    candidate({title: 'A.Loginov KHL game.jpeg', categories: 'Alexander Loginov (ice hockey)|2012–13 KHL season'}),
  );
  assert.equal(result.downloadEligible, false);
  assert.ok(result.reasons.includes('SPORT_CONTEXT_MISSING'));
  assert.ok(result.reasons.includes('CONFLICTING_SPORT_CONTEXT'));
});

test('rejects Svetlana Mironova orienteer namesake', () => {
  const result = assessAthleteCandidate(
    {name: 'Svetlana Mironova', sport: 'biathlon'},
    candidate({title: 'Svetlana Mironova (russian orienteer).jpg', categories: 'Orienteers from Russia|World Orienteering Championships 2014'}),
  );
  assert.equal(result.downloadEligible, false);
});

test('rejects non-image media even with correct name and sport', () => {
  const result = assessAthleteCandidate(
    {name: 'Gunde Svan', sport: 'cross_country'},
    candidate({title: 'Gunde Svan cross country skier.ogg', categories: 'Gunde Svan|Cross-country skiers from Sweden', mime: 'application/ogg'}),
  );
  assert.equal(result.downloadEligible, false);
  assert.ok(result.reasons.includes('UNSUPPORTED_MEDIA_TYPE'));
});

test('accepts transliterated Nordic names with oe/o variants', () => {
  const result = assessAthleteCandidate(
    {name: 'Endre Stroemsheim', sport: 'biathlon'},
    candidate({title: 'Biathlon Junior World Championships 2016, Endre Strømsheim.jpg', categories: 'Biathletes in 2016|Endre Strømsheim'}),
  );
  assert.equal(result.downloadEligible, true);
});

test('keeps ambiguous correct-name portrait in review when sport context is missing', () => {
  const result = assessAthleteCandidate(
    {name: 'Eduard Latypov', sport: 'biathlon'},
    candidate({title: 'Eduard Latypov.jpg', categories: 'Eduard Latypov|Media from the Russian Ministry of Defence'}),
  );
  assert.equal(result.downloadEligible, false);
  assert.equal(result.identityHeuristicStatus, 'review_required');
});

test('maps only supported web image MIME types to extensions', () => {
  assert.equal(extensionForMime('image/jpeg'), 'jpg');
  assert.equal(extensionForMime('image/png'), 'png');
  assert.equal(extensionForMime('image/webp'), 'webp');
  assert.equal(extensionForMime('application/ogg'), null);
});
