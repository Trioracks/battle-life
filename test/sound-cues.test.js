import test from 'node:test';
import assert from 'node:assert/strict';
import { getSoundCue } from '../src/sound-cues.js?rev=27';

test('sound registry reserves stable replaceable keys for apartment feedback', () => {
  assert.deepEqual(getSoundCue('footstep'), { id: 'footstep', type: 'tick', frequency: 130, duration: .045 });
  assert.equal(getSoundCue('computer').id, 'computer');
  assert.equal(getSoundCue('chair-scrape').id, 'chair-scrape');
  assert.equal(getSoundCue('unknown'), null);
});
