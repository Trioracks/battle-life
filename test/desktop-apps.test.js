import test from 'node:test';
import assert from 'node:assert/strict';
import { getDesktopAction, getDesktopApp, openDesktopApp } from '../src/desktop-apps.js';

test('desktop exposes the four MVP applications and opens a known view', () => {
  assert.equal(getDesktopApp('battles').label, 'Рэп-Сеть');
  assert.equal(openDesktopApp('market').view, 'market');
  assert.equal(openDesktopApp('missing'), null);
});

test('archive study is an observable desktop action with a return destination', () => {
  assert.deepEqual(getDesktopAction('research-archive'), {
    id: 'research-archive',
    label: 'Изучает архив MAKAREWITCH VI',
    minutes: 60,
    returnView: 'battles',
  });
  assert.equal(getDesktopAction('missing'), null);
});
