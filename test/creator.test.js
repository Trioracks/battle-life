import test from 'node:test';
import assert from 'node:assert/strict';
import { createRapper, cycleLookPart, lookPartAtPreviewHeight, validateAllocations } from '../src/creator.js';

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
    look: { hair: 'mohawk', face: 'mustache', top: 'bomber', pants: 'jeans', cap: 'teal' },
  });

  assert.equal(rapper.name, 'Миша');
  assert.equal(rapper.nickname, 'Ночной Маяк');
  assert.equal(rapper.skills.intelligence, 30);
  assert.equal(rapper.skills.resilience, 10);
  assert.deepEqual(rapper.look, { hair: 'mohawk', face: 'mustache', top: 'bomber', pants: 'jeans' });
});

test('creator cycles body-zone appearance without adding a cap back into saved look', () => {
  const base = { hair: 'bald', face: 'clean', top: 'hoodie', pants: 'cargo' };

  assert.deepEqual(cycleLookPart(base, 'hair', 1), { ...base, hair: 'crop' });
  assert.deepEqual(cycleLookPart(base, 'face', -1), { ...base, face: 'mustache' });
  assert.deepEqual(cycleLookPart(base, 'top', -1), { ...base, top: 'jacket' });
  assert.deepEqual(cycleLookPart(base, 'pants', 1), { ...base, pants: 'jeans' });
  assert.equal(Object.hasOwn(cycleLookPart({ ...base, cap: 'red' }, 'hair', 1), 'cap'), false);
});

test('creator maps a click on the preview body to the closest appearance zone', () => {
  assert.equal(lookPartAtPreviewHeight(.2), 'hair');
  assert.equal(lookPartAtPreviewHeight(.42), 'face');
  assert.equal(lookPartAtPreviewHeight(.61), 'top');
  assert.equal(lookPartAtPreviewHeight(.86), 'pants');
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
