import test from 'node:test';
import assert from 'node:assert/strict';
import { createVirtualPcState } from '../src/virtual-pc-state.js';
import { BATTLE_BRIEFS, WALLPAPERS, desktopApps, resolveUnderweb } from '../src/virtual-pc-catalog.js';

test('the fictional desktop exposes its own apps and reveals ft studio only after install', () => {
  const initialIds = desktopApps(createVirtualPcState()).map(app => app.id);
  const installedIds = desktopApps(createVirtualPcState({ download: { status: 'installed' } })).map(app => app.id);

  assert.deepEqual(initialIds, ['computer', 'underweb']);
  assert.deepEqual(installedIds, ['computer', 'underweb', 'ft-studio']);
});

test('underweb has three local battle briefs and three selectable wallpapers', () => {
  const page = resolveUnderweb('underweb://battles');

  assert.equal(BATTLE_BRIEFS.length, 3);
  assert.equal(WALLPAPERS.length, 3);
  assert.equal(page.type, 'battles');
  assert.deepEqual(page.briefs.map(brief => brief.id), BATTLE_BRIEFS.map(brief => brief.id));
});

test('underweb routes a known battle locally and rejects unknown addresses', () => {
  const known = resolveUnderweb(`underweb://battles/${BATTLE_BRIEFS[0].id}`);
  const unknown = resolveUnderweb('https://example.com/real-internet');

  assert.equal(known.type, 'battle');
  assert.equal(known.brief.id, BATTLE_BRIEFS[0].id);
  assert.equal(unknown.type, 'error');
  assert.match(unknown.message, /не найден/i);
});
