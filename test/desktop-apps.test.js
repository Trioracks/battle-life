import test from 'node:test';
import assert from 'node:assert/strict';
import { getDesktopApp, openDesktopApp } from '../src/desktop-apps.js';

test('desktop exposes the four MVP applications and opens a known view', () => {
  assert.equal(getDesktopApp('battles').label, 'BattleNet');
  assert.equal(openDesktopApp('market').view, 'market');
  assert.equal(openDesktopApp('missing'), null);
});
