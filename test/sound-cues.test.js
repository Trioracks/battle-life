import test from 'node:test';
import assert from 'node:assert/strict';
import { getSoundCue } from '../src/sound-cues.js';

test('sound registry reserves stable replaceable keys for apartment feedback', () => {
  assert.deepEqual(getSoundCue('footstep'), { id: 'footstep', type: 'tick', frequency: 130, duration: .045 });
  assert.equal(getSoundCue('computer').id, 'computer');
  assert.equal(getSoundCue('unknown'), null);
});
