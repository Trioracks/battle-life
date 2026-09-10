import test from 'node:test';
import assert from 'node:assert/strict';
import { createRapper, validateAllocations } from '../src/creator.js';

test('creator turns ten allocated points into visible 10–50 skills', () => {
  const rapper = createRapper({
    name: 'Миша',
    nickname: 'Ночной Маяк',
    allocations: {
      intelligence: 2,
      writing: 2,
      musicality: 1,
      flow: 1,
      beatmaking: 1,
      sound: 1,
      charisma: 1,
      confidence: 1,
      resilience: 0,
    },
    look: { hair: 'mohawk', top: 'bomber', pants: 'jeans', cap: 'teal' },
  });

  assert.equal(rapper.name, 'Миша');
  assert.equal(rapper.nickname, 'Ночной Маяк');
  assert.equal(rapper.skills.intelligence, 30);
  assert.equal(rapper.skills.resilience, 10);
  assert.deepEqual(rapper.look, { hair: 'mohawk', top: 'bomber', pants: 'jeans', cap: 'teal' });
});

test('creator refuses an allocation above the 50-point per-stat ceiling', () => {
  const result = validateAllocations({
    intelligence: 5,
    writing: 1,
    musicality: 1,
    flow: 1,
    beatmaking: 1,
    sound: 0,
    charisma: 0,
    confidence: 0,
    resilience: 0,
  });

  assert.equal(result.valid, false);
  assert.match(result.message, /50/);
});

test('creator requires exactly ten points and a nickname', () => {
  const allocation = { intelligence: 1, writing: 1, musicality: 1, flow: 1, beatmaking: 1, sound: 1, charisma: 1, confidence: 1, resilience: 1 };

  assert.deepEqual(validateAllocations(allocation), { valid: false, total: 9, message: 'Распредели все 10 очков.' });
  assert.throws(() => createRapper({ name: 'Миша', nickname: ' ', allocations: { ...allocation, intelligence: 2 }, look: {} }), /никнейм/i);
});
