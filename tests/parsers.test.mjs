import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseFisResults,seconds} from '../scripts/lib/parse-fis.mjs';
// Synthetic grammar fixtures only: these are NOT sports results and are never imported.
test('FIS parser recognizes a minimal documented fixture',()=>{const rows=parseFisResults('<h2>Official Results</h2><div>1 12 TEST ATHLETE 1996 NOR 24:30.5 0.00</div>');assert.equal(rows.length,1);assert.equal(rows[0].athlete,'TEST ATHLETE');assert.equal(rows[0].time_raw,'24:30.5')});
test('FIS parser does not turn an unrelated or blocked page into results',()=>{assert.deepEqual(parseFisResults('<h1>Access denied</h1>'),[]);assert.deepEqual(parseFisResults('<script>Official Results 1 12 TEST ATHLETE 1996 NOR 24:30.5 0.00</script>'),[])});
test('time parsing covers hours, minutes and decimal seconds',()=>{assert.equal(seconds('1:02:03.5'),3723.5);assert.equal(seconds('24:30.5'),1470.5);assert.equal(seconds('+12.3'),12.3);assert.equal(seconds(null),null)});
