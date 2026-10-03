import {test} from 'node:test';import assert from 'node:assert/strict';import {raceLabel} from '../lib/viewer.mjs';
test('ordinary and team sprint phases appear distinctly in Russian without losing published distances',()=>{
 assert.equal(raceLabel({discipline:'Sprint Qualification Classic',distance:'1.2 km'}),'Спринт — квалификация · классический стиль · 1.2 km');
 assert.equal(raceLabel({discipline:'Sprint Final Free',distance:'1.2 km'}),'Спринт — финал · свободный стиль · 1.2 km');
 assert.equal(raceLabel({discipline:'Team Sprint Qualification Free',distance:'1.4 km'}),'Командный спринт — квалификация · свободный стиль · 1.4 km');
 assert.equal(raceLabel({discipline:'Team Sprint Final Classic',distance:'2x4.5 km'}),'Командный спринт — финал · классический стиль · 2x4.5 km');
});
